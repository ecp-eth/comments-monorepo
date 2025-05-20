import { useCommentRetryEdition } from "@ecp.eth/shared/hooks";
import type { Comment } from "@ecp.eth/shared/schemas";
import type { QueryKey } from "@tanstack/react-query";
import { useCallback } from "react";
import { useConfig, useSwitchChain } from "wagmi";
import { submitEditCommentMutationFunction } from "../queries";
import type { Hex } from "viem";
import { TX_RECEIPT_TIMEOUT } from "../../../lib/constants";
import { useEditComment as useEditCommentSdk } from "@ecp.eth/sdk/comments/react";
import { waitForTransactionReceipt } from "@wagmi/core";

export type OnRetryEditCommentParams = {
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

export type OnRetryEditComment = (
  params: OnRetryEditCommentParams,
) => Promise<void>;

type UseRetryEditCommentParams = {
  connectedAddress: Hex | undefined;
};

export function useRetryEditComment({
  connectedAddress,
}: UseRetryEditCommentParams): OnRetryEditComment {
  const wagmiConfig = useConfig();
  const commentRetryEdition = useCommentRetryEdition();
  const { switchChainAsync } = useSwitchChain();
  const { mutateAsync: editComment } = useEditCommentSdk();

  return useCallback<OnRetryEditComment>(
    async (params) => {
      const { comment } = params;

      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type !== "non-gasless") {
        throw new Error("Only non-gasless comments can be retried");
      }

      if (comment.pendingOperation.action !== "edit") {
        throw new Error("Only edit comments can be retried");
      }

      const pendingOperation = await submitEditCommentMutationFunction({
        address: connectedAddress,
        comment,
        editRequest: {
          ...comment.pendingOperation.response.data,
          chainId: comment.pendingOperation.chainId,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({ signEditCommentResponse }) {
          const { txHash } = await editComment({
            edit: signEditCommentResponse.data,
            appSignature: signEditCommentResponse.signature,
          });

          return txHash;
        },
      });

      try {
        commentRetryEdition.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentRetryEdition.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentRetryEdition.error({
          pendingOperation,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      connectedAddress,
      switchChainAsync,
      editComment,
      commentRetryEdition,
      wagmiConfig,
    ],
  );
}
