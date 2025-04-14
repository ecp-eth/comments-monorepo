import { useCommentRetrySubmission } from "@ecp.eth/shared/hooks";
import type { Comment } from "@ecp.eth/shared/schemas";
import type { QueryKey } from "@tanstack/react-query";
import { useCallback } from "react";
import { useConnectorClient, useSwitchChain, useWriteContract } from "wagmi";
import { submitCommentMutationFunction } from "../queries";
import type { Hex } from "viem";
import { switchChain, waitForTransactionReceipt } from "viem/actions";
import { TX_RECEIPT_TIMEOUT } from "../../../lib/constants";
import { postCommentAsAuthorViaCommentsV1 } from "@ecp.eth/shared/helpers";

export type OnRetryPostCommentParams = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called when transaction was created.
   */
  onStart?: () => void;
};

export type OnRetryPostComment = (
  params: OnRetryPostCommentParams
) => Promise<void>;

type UseRetryPostCommentParams = {
  connectedAddress: Hex | undefined;
};

export function useRetryPostComment({
  connectedAddress,
}: UseRetryPostCommentParams): OnRetryPostComment {
  const { data: client } = useConnectorClient();
  const commentRetrySubmission = useCommentRetrySubmission();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  return useCallback<OnRetryPostComment>(
    async (params) => {
      const { comment } = params;

      if (!client) {
        throw new Error("No connector client");
      }

      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type !== "non-gasless") {
        throw new Error("Only non-gasless comments can be retried");
      }

      if (comment.pendingOperation.action !== "post") {
        throw new Error("Only post comments can be retried");
      }

      const pendingOperation = await submitCommentMutationFunction({
        address: connectedAddress,
        commentRequest: {
          chainId: comment.pendingOperation.chainId,
          content: comment.content,
          ...(comment.parentId
            ? {
                parentId: comment.parentId,
              }
            : {
                targetUri: comment.targetUri,
              }),
        },
        switchChainAsync(chainId) {
          switchChain(client, { id: chainId });
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({
          signCommentResponse: { signature: appSignature, data: commentData },
        }) {
          return await postCommentAsAuthorViaCommentsV1(
            { appSignature, commentData },
            writeContractAsync
          );
        },
      });

      try {
        commentRetrySubmission.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(client, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentRetrySubmission.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentRetrySubmission.error({
          pendingOperation,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      client,
      connectedAddress,
      writeContractAsync,
      switchChainAsync,
      commentRetrySubmission,
    ]
  );
}
