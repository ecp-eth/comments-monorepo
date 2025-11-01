import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnEditComment,
  OnLikeComment,
  OnPostComment,
  OnRetryEditComment,
  OnRetryPostComment,
  OnUnlikeComment,
} from "../../core/CommentActionsContext";
import type { Hex } from "viem";
import { waitForTransactionReceipt, getChainId } from "@wagmi/core";
import { useConfig } from "wagmi";
import {
  useCommentDeletion,
  useCommentEdition,
  useCommentRetryEdition,
  useCommentRetrySubmission,
  useCommentSubmission,
  useReactionRemoval,
  useReactionSubmission,
} from "@ecp.eth/shared/hooks";
import type {
  PendingDeleteCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import {
  useGaslessEditComment,
  useGaslessSubmitComment,
} from "./useGaslessSubmitComment";
import { useGaslessDeleteComment } from "./useGaslessDeleteComment";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";

type UseGaslessCommentActionsProps = {
  connectedAddress: Hex | undefined;
  /**
   * Did user approved the app to do operations on their behalf?
   */
  hasApproval: boolean;
};

export function useGaslessCommentActions({
  connectedAddress,
  hasApproval,
}: UseGaslessCommentActionsProps): CommentActionsContextType {
  const wagmiConfig = useConfig();
  const deleteCommentMutation = useGaslessDeleteComment({
    connectedAddress,
  });
  const submitCommentMutation = useGaslessSubmitComment();
  const { mutateAsync: submitComment } = submitCommentMutation;
  const commentDeletion = useCommentDeletion();
  const commentRetrySubmission = useCommentRetrySubmission();
  const commentSubmission = useCommentSubmission();
  const editCommentMutation = useGaslessEditComment();
  const { mutateAsync: submitEditComment } = editCommentMutation;
  const commentEdition = useCommentEdition();
  const commentRetryEdition = useCommentRetryEdition();
  const likeReactionSubmission = useReactionSubmission(
    COMMENT_REACTION_LIKE_CONTENT,
  );
  const likeReactionRemoval = useReactionRemoval(COMMENT_REACTION_LIKE_CONTENT);

  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        const txHash = await deleteCommentMutation.mutateAsync({
          comment: params.comment,
          submitIfApproved: hasApproval,
        });

        const chainId = getChainId(wagmiConfig);

        const pendingOperation: PendingDeleteCommentOperationSchemaType = {
          action: "delete",
          chainId,
          commentId: params.comment.id,
          state: { status: "pending" },
          type: hasApproval ? "gasless-preapproved" : "gasless-not-preapproved",
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
          queryKey: params.queryKey,
          pendingOperation,
        });
      } catch (e) {
        commentDeletion.error({
          queryKey: params.queryKey,
          commentId: params.comment.id,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [wagmiConfig, deleteCommentMutation, hasApproval, commentDeletion],
  );

  const retryPostComment = useCallback<OnRetryPostComment>(
    async (params) => {
      const { comment } = params;

      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type === "non-gasless") {
        throw new Error("Only gasless comments can be retried");
      }

      if (comment.pendingOperation.action !== "post") {
        throw new Error("Only post comments can be retried");
      }

      const pendingOperation = await submitComment({
        content: comment.content,
        gasSponsorship: comment.pendingOperation.type,
        targetUri: comment.targetUri,
        ...(comment.parentId && { parentId: comment.parentId }),
        metadata: comment.metadata,
        references: comment.references,
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
    [wagmiConfig, submitComment, commentRetrySubmission],
  );

  const postComment = useCallback<OnPostComment>(
    async (params) => {
      const pendingOperation = await submitComment({
        content: params.comment.content,
        references: params.comment.references,
        gasSponsorship: hasApproval
          ? "gasless-preapproved"
          : "gasless-not-preapproved",
        metadata: params.comment.metadata ?? [],
        ...("targetUri" in params.comment
          ? {
              targetUri: params.comment.targetUri,
            }
          : {
              parentId: params.comment.parentId,
            }),
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
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentSubmission.error({
          queryKey: params.queryKey,
          commentId: pendingOperation.response.data.id,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [wagmiConfig, hasApproval, commentSubmission, submitComment],
  );

  const editComment = useCallback<OnEditComment>(
    async (params) => {
      const pendingOperation = {
        ...(await submitEditComment({
          isApproved: hasApproval,
          commentId: params.comment.id,
          content: params.edit.content,
          metadata: params.edit.metadata,
        })),
        references: params.edit.references,
      };

      try {
        commentEdition.start({
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

        commentEdition.success({
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentEdition.error({
          queryKey: params.queryKey,
          commentId: pendingOperation.response.data.commentId,
          error: e instanceof Error ? e : new Error(String(e)),
        });
      }
    },
    [hasApproval, submitEditComment, commentEdition, wagmiConfig],
  );

  const retryEditComment = useCallback<OnRetryEditComment>(
    async (params) => {
      const { comment } = params;

      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type === "non-gasless") {
        throw new Error("Only gasless comments can be retried");
      }

      if (comment.pendingOperation.action !== "edit") {
        throw new Error("Only edit comments can be retried");
      }

      const pendingOperation = {
        ...(await submitEditComment({
          isApproved: comment.pendingOperation.type === "gasless-preapproved",
          commentId: comment.id,
          content: comment.content,
          metadata: comment.metadata ?? [],
        })),
        references: comment.references,
      };

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
    [submitEditComment, commentRetryEdition, wagmiConfig],
  );

  const likeComment = useCallback<OnLikeComment>(
    async (params) => {
      const {
        comment,
        queryKey: parentCommentQueryKey,
        onBeforeStart,
        onFailed,
        onSuccess,
      } = params;

      onBeforeStart?.();

      let pendingOperation: PendingPostCommentOperationSchemaType | undefined =
        undefined;

      try {
        pendingOperation = await submitComment({
          content: COMMENT_REACTION_LIKE_CONTENT,
          metadata: [],
          commentType: COMMENT_TYPE_REACTION,
          parentId: comment.id,
          gasSponsorship: hasApproval
            ? "gasless-preapproved"
            : "gasless-not-preapproved",
          references: [],
        });

        likeReactionSubmission.start({
          ...params,
          queryKey: parentCommentQueryKey,
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
          queryKey: parentCommentQueryKey,
          pendingOperation,
        });
      } catch (e) {
        onFailed?.(e);

        if (pendingOperation) {
          likeReactionSubmission.error({
            ...params,
            queryKey: parentCommentQueryKey,
            pendingOperation,
          });
        }

        throw e;
      }
    },
    [hasApproval, likeReactionSubmission, submitComment, wagmiConfig],
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

        const txHash = await deleteCommentMutation.mutateAsync({
          comment: reaction,
          submitIfApproved: hasApproval,
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
    [deleteCommentMutation, hasApproval, likeReactionRemoval, wagmiConfig],
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
