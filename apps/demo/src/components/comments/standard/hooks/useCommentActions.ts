import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
} from "../../core/CommentActionsContext";
import type { Hex } from "viem";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useSwitchChain, useConfig } from "wagmi";
import {
  useCommentDeletion,
  useCommentRetrySubmission,
  useCommentSubmission,
} from "@ecp.eth/shared/hooks";
import { submitCommentMutationFunction } from "../queries";
import {
  useDeleteCommentAsAuthor,
  usePostCommentAsAuthor,
} from "@ecp.eth/sdk/comments/react";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";

type UseCommentActionsProps = {
  connectedAddress: Hex | undefined;
};

export function useCommentActions({
  connectedAddress,
}: UseCommentActionsProps): CommentActionsContextType {
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const commentDeletion = useCommentDeletion();
  const commentRetrySubmission = useCommentRetrySubmission();
  const commentSubmission = useCommentSubmission();
  const { mutateAsync: deleteCommentAsAuthor } = useDeleteCommentAsAuthor();
  const { mutateAsync: postCommentAsAuthor } = usePostCommentAsAuthor();
  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        const { txHash } = await deleteCommentAsAuthor({
          commentId: params.comment.id,
        });

        const pendingOperation: PendingDeleteCommentOperationSchemaType = {
          action: "delete",
          chainId: params.comment.chainId,
          commentId: params.comment.id,
          state: { status: "pending" },
          type: "non-gasless",
          txHash,
        };

        commentDeletion.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentDeletion.success({
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentDeletion.error({
          commentId: params.comment.id,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [wagmiConfig, commentDeletion]
  );

  const retryPostComment = useCallback<OnRetryPostComment>(
    async (params) => {
      const { comment } = params;

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
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({
          signCommentResponse: { signature: appSignature, data: commentData },
        }) {
          const { txHash } = await postCommentAsAuthor({
            appSignature,
            comment: commentData,
          });

          return txHash;
        },
      });

      try {
        commentRetrySubmission.start({
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
    [wagmiConfig, connectedAddress, commentRetrySubmission]
  );

  const postComment = useCallback<OnPostComment>(
    async (params) => {
      const { comment } = params;

      const pendingOperation = await submitCommentMutationFunction({
        address: params.address,
        commentRequest: {
          content: comment.content,
          ...("parentId" in comment
            ? {
                parentId: comment.parentId,
                targetUri: "",
              }
            : {
                targetUri: comment.targetUri,
              }),
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({
          signCommentResponse: { signature: appSignature, data: commentData },
        }) {
          const { txHash } = await postCommentAsAuthor({
            appSignature,
            comment: commentData,
          });

          return txHash;
        },
      });

      try {
        commentSubmission.start({
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

        commentSubmission.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentSubmission.error({
          commentId: pendingOperation.response.data.id,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [wagmiConfig, commentSubmission]
  );

  return useMemo(
    () => ({
      deleteComment,
      retryPostComment,
      postComment,
    }),
    [deleteComment, retryPostComment, postComment]
  );
}
