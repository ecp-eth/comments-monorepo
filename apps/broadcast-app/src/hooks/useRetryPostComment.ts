import { signCommentOrReaction } from "@/api/sign-comment-or-reaction";
import { TX_RECEIPT_TIMEOUT } from "@/constants";
import { SignCommentError, SubmitCommentMutationError } from "@/errors";
import { getChannelCaipUri } from "@/lib/utils";
import { chain } from "@/wagmi/config";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { postComment } from "@ecp.eth/sdk/comments";
import { isZeroHex } from "@ecp.eth/sdk/core";
import { InvalidCommentError } from "@ecp.eth/shared/errors";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { useCommentRetrySubmission } from "@ecp.eth/shared/hooks";
import type {
  Comment,
  PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { useMutation, type QueryKey } from "@tanstack/react-query";
import { waitForTransactionReceipt } from "@wagmi/core";
import { ContractFunctionExecutionError } from "viem";
import { useConfig, useWriteContract } from "wagmi";
import z from "zod";

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

export function useRetryPostComment() {
  const commentRetrySubmission = useCommentRetrySubmission();
  const { writeContractAsync } = useWriteContract();
  const wagmiConfig = useConfig();

  return useMutation({
    mutationFn: async (params: OnRetryPostCommentParams) => {
      let pendingOperation: PendingPostCommentOperationSchemaType | undefined;

      try {
        const { comment } = params;

        if (!comment.pendingOperation) {
          throw new Error("No pending operation to retry");
        }

        if (comment.pendingOperation.action !== "post") {
          throw new Error("Only post comments can be retried");
        }

        const signedCommentResponse = await signCommentOrReaction({
          author: comment.author.address,
          channelId: comment.channelId,
          content: comment.content,
          metadata: [],
          ...(comment.parentId && !isZeroHex(comment.parentId)
            ? {
                parentId: comment.parentId,
              }
            : {
                targetUri: getChannelCaipUri({
                  chainId: comment.chainId,
                  channelId: comment.channelId,
                }),
              }),
        });

        const { txHash } = await postComment({
          commentsAddress: SUPPORTED_CHAINS[chain.id].commentManagerAddress,
          appSignature: signedCommentResponse.signature,
          comment: signedCommentResponse.data,
          writeContract: writeContractAsync,
        });

        pendingOperation = {
          action: "post",
          type: "non-gasless",
          txHash,
          chainId: comment.chainId,
          references: comment.references,
          response: {
            ...signedCommentResponse,
            data: {
              ...signedCommentResponse.data,
              // this fixes an issue when /sign-comment returns always different id for each request
              id: comment.id,
            },
          },
          state: {
            status: "pending",
          },
          resolvedAuthor: comment.author,
        };

        commentRetrySubmission.start({
          queryKey: params.queryKey,
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

        commentRetrySubmission.success({
          queryKey: params.queryKey,
          pendingOperation,
        });
      } catch (e) {
        if (pendingOperation) {
          commentRetrySubmission.error({
            pendingOperation,
            queryKey: params.queryKey,
            error: e instanceof Error ? e : new Error(String(e)),
          });
        }

        if (e instanceof z.ZodError) {
          throw new InvalidCommentError(
            e.flatten().fieldErrors as Record<string, string[]>,
          );
        } else if (e instanceof SignCommentError) {
          throw new SubmitCommentMutationError(e.message);
        } else if (e instanceof ContractFunctionExecutionError) {
          throw new SubmitCommentMutationError(
            formatContractFunctionExecutionError(e),
          );
        }

        throw e;
      }
    },
  });
}
