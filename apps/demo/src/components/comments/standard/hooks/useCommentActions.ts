import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
  OnEditComment,
  OnRetryEditComment,
} from "../../core/CommentActionsContext";
import type { Hex } from "viem";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useSwitchChain, useConfig } from "wagmi";
import {
  useCommentDeletion,
  useCommentRetrySubmission,
  useCommentSubmission,
  useCommentEdition,
  useCommentRetryEdition,
} from "@ecp.eth/shared/hooks";
import {
  submitCommentMutationFunction,
  submitEditCommentMutationFunction,
} from "../queries";
import {
  useDeleteCommentAsAuthor,
  usePostCommentAsAuthor,
  useEditCommentAsAuthor,
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
  const commentEdition = useCommentEdition();
  const commentRetryEdition = useCommentRetryEdition();
  const { mutateAsync: deleteCommentAsAuthor } = useDeleteCommentAsAuthor();
  const { mutateAsync: postCommentAsAuthor } = usePostCommentAsAuthor();
  const { mutateAsync: editCommentAsAuthor } = useEditCommentAsAuthor();
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
    [wagmiConfig, commentDeletion, deleteCommentAsAuthor],
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
    [
      wagmiConfig,
      connectedAddress,
      commentRetrySubmission,
      switchChainAsync,
      postCommentAsAuthor,
    ],
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
    [wagmiConfig, commentSubmission, postCommentAsAuthor, switchChainAsync],
  );

  const editComment = useCallback<OnEditComment>(
    async (params) => {
      const { comment, edit, address } = params;

      const pendingOperation = await submitEditCommentMutationFunction({
        address,
        editRequest: edit,
        comment,
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({
          signEditCommentResponse: { signature: appSignature, data },
        }) {
          const { txHash } = await editCommentAsAuthor({
            appSignature,
            edit: data,
          });

          return txHash;
        },
      });

      commentEdition.start({
        ...params,
        pendingOperation,
      });

      params.onStart?.();

      try {
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentEdition.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentEdition.error({
          commentId: pendingOperation.response.data.commentId,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [commentEdition, editCommentAsAuthor, switchChainAsync, wagmiConfig],
  );

  const retryEditComment = useCallback<OnRetryEditComment>(
    async (params) => {
      const { comment } = params;

      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type !== "non-gasless") {
        throw new Error("Only non-gasless edit operations can be retried");
      }

      if (comment.pendingOperation.action !== "edit") {
        throw new Error("Only edit comments can be retried");
      }

      const pendingOperation = await submitEditCommentMutationFunction({
        address: connectedAddress,
        editRequest: comment.pendingOperation.response.data,
        comment,
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({
          signEditCommentResponse: { signature: appSignature, data },
        }) {
          const { txHash } = await editCommentAsAuthor({
            appSignature,
            edit: data,
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
      editCommentAsAuthor,
      switchChainAsync,
      wagmiConfig,
      commentRetryEdition,
    ],
  );

  return useMemo(
    () => ({
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
    }),
    [
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
    ],
  );
}
