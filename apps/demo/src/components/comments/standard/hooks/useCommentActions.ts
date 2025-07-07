import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
  OnEditComment,
  OnRetryEditComment,
  OnLikeComment,
  OnUnlikeComment,
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
  useReactionSubmission,
  useReactionRemoval,
} from "@ecp.eth/shared/hooks";
import {
  submitCommentMutationFunction,
  submitEditCommentMutationFunction,
} from "../queries";
import {
  useDeleteComment,
  usePostComment,
  useEditComment,
} from "@ecp.eth/sdk/comments/react";
import type {
  PendingDeleteCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import {
  COMMENT_REACTION_LIKE_CONTENT,
  TX_RECEIPT_TIMEOUT,
} from "@/lib/constants";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";

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
  const { mutateAsync: deleteCommentMutation } = useDeleteComment();
  const { mutateAsync: postCommentMutation } = usePostComment();
  const { mutateAsync: editCommentMutation } = useEditComment();
  const likeReactionSubmission = useReactionSubmission(
    COMMENT_REACTION_LIKE_CONTENT,
  );
  const likeReactionRemoval = useReactionRemoval(COMMENT_REACTION_LIKE_CONTENT);

  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        const { txHash } = await deleteCommentMutation({
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
    [wagmiConfig, commentDeletion, deleteCommentMutation],
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
        author: connectedAddress,
        zeroExSwap: null,
        references: comment.references,
        commentRequest: {
          content: comment.content,
          metadata: comment.metadata,
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
          const { txHash } = await postCommentMutation({
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
      postCommentMutation,
    ],
  );

  const postComment = useCallback<OnPostComment>(
    async (params) => {
      const { comment } = params;

      const pendingOperation = await submitCommentMutationFunction({
        author: connectedAddress,
        zeroExSwap: null,
        references: comment.references,
        commentRequest: {
          content: comment.content,
          metadata: comment.metadata ?? [],
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
          const { txHash } = await postCommentMutation({
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
    [
      connectedAddress,
      switchChainAsync,
      postCommentMutation,
      commentSubmission,
      wagmiConfig,
    ],
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
          const { txHash } = await editCommentMutation({
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
    [commentEdition, editCommentMutation, switchChainAsync, wagmiConfig],
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
          const { txHash } = await editCommentMutation({
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
      editCommentMutation,
      switchChainAsync,
      wagmiConfig,
      commentRetryEdition,
    ],
  );

  const likeComment = useCallback<OnLikeComment>(
    async (params) => {
      const { comment, queryKey, onBeforeStart, onFailed, onSuccess } = params;

      if (
        (comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT]?.length ??
          0) > 0
      ) {
        throw new Error("Comment already liked");
      }

      onBeforeStart?.();

      let pendingOperation: PendingPostCommentOperationSchemaType | undefined =
        undefined;

      try {
        pendingOperation = await submitCommentMutationFunction({
          author: connectedAddress,
          zeroExSwap: null,
          commentRequest: {
            content: COMMENT_REACTION_LIKE_CONTENT,
            metadata: [],
            commentType: COMMENT_TYPE_REACTION,
            parentId: comment.id,
          },
          references: [],
          switchChainAsync(chainId) {
            return switchChainAsync({ chainId });
          },
          async writeContractAsync({
            signCommentResponse: { signature: appSignature, data: commentData },
          }) {
            const { txHash } = await postCommentMutation({
              appSignature,
              comment: commentData,
            });

            return txHash;
          },
        });

        likeReactionSubmission.start({
          ...params,
          queryKey,
          pendingOperation,
        });

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        onSuccess?.();

        likeReactionSubmission.success({
          ...params,
          queryKey,
          pendingOperation,
        });
      } catch (e) {
        onFailed?.(e);

        if (pendingOperation) {
          likeReactionSubmission.error({
            ...params,
            queryKey,
            pendingOperation,
          });
        }

        throw e;
      }
    },
    [
      likeReactionSubmission,
      connectedAddress,
      postCommentMutation,
      switchChainAsync,
      wagmiConfig,
    ],
  );

  const unlikeComment = useCallback<OnUnlikeComment>(
    async (params) => {
      const {
        comment,
        queryKey: parentCommentQueryKey,
        onBeforeStart,
        onFailed,
      } = params;

      const reactions =
        comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT] ?? [];

      const reaction = reactions[reactions.length - 1];

      if (!reaction) {
        throw new Error("Reaction not found");
      }

      const reactionRemovalParams = {
        reactionId: reaction.id,
        parentCommentId: comment.id,
        queryKey: parentCommentQueryKey,
      };

      try {
        onBeforeStart?.();

        const { txHash } = await deleteCommentMutation({
          commentId: reaction.id,
        });

        // Optimistically remove the reaction from the UI
        likeReactionRemoval.start(reactionRemovalParams);

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        likeReactionRemoval.success(reactionRemovalParams);
      } catch (e) {
        onFailed?.(e);

        likeReactionRemoval.error(reactionRemovalParams);

        throw e;
      }
    },
    [likeReactionRemoval, deleteCommentMutation, wagmiConfig],
  );

  return useMemo(
    () => ({
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
      likeComment,
      unlikeComment,
    }),
    [
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
      likeComment,
      unlikeComment,
    ],
  );
}
