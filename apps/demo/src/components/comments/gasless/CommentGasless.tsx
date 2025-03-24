import { useCallback, useEffect, useMemo } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useMutation } from "@tanstack/react-query";
import { publicEnv } from "@/publicEnv";
import {
  useHandleCommentDeleted,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
  useFreshRef,
} from "@ecp.eth/shared/hooks";
import { useDeleteGaslessComment, useSubmitGaslessComment } from "../hooks";
import { type Comment as CommentType } from "@/lib/schemas";
import type {
  OnDeleteComment,
  OnRetryPostComment,
} from "@ecp.eth/shared/types";
import { toast } from "sonner";
import never from "never";
import { CommentShared } from "../CommentShared";
import { useCommentGaslessContext } from "./CommentGaslessProvider";
import { CommentGaslessForm } from "./CommentGaslessForm";

interface CommentProps {
  comment: CommentType;
  onDelete: OnDeleteComment;
  /**
   * Called when comment posting to blockchain failed and the transaction has been reverted
   * and user pressed retry.
   */
  onRetryPost: OnRetryPostComment;
  level?: number;
}

export function CommentGasless({
  comment,
  onRetryPost,
  onDelete,
  level = 0,
}: CommentProps) {
  const { isApproved: submitIfApproved } = useCommentGaslessContext();
  const { address: connectedAddress } = useAccount();
  const onDeleteRef = useFreshRef(onDelete);
  /**
   * Prevents infinite cycle when delete comment transaction succeeded
   * because comment is updated to be redacted
   */
  const commentRef = useFreshRef(comment);
  const areRepliesAllowed = level < publicEnv.NEXT_PUBLIC_REPLY_DEPTH_CUTOFF;
  const queryKey = useMemo(() => ["comments", comment.id], [comment.id]);
  const submitTargetCommentId = areRepliesAllowed
    ? comment.id
    : (comment.parentId ?? never("parentId is required for comment depth > 0"));
  const submitTargetQueryKey = useMemo(
    () => ["comments", submitTargetCommentId],
    [submitTargetCommentId]
  );

  const handleCommentSubmitted = useHandleCommentSubmitted({
    queryKey: submitTargetQueryKey,
  });
  const handleRetryPostComment = useHandleRetryPostComment({
    queryKey: submitTargetQueryKey,
  });
  const handleCommentDeleted = useHandleCommentDeleted({ queryKey });

  const submitCommentMutation = useSubmitGaslessComment();

  const retryPostMutation = useMutation({
    mutationFn: async () => {
      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type === "non-gasless") {
        throw new Error("Only gasless comments can be retried");
      }

      return submitCommentMutation.mutateAsync({
        content: comment.pendingOperation.response.data.content,
        isApproved: comment.pendingOperation.type === "gasless-preapproved",
        targetUri: comment.pendingOperation.response.data.targetUri,
        parentId: comment.pendingOperation.response.data.parentId,
      });
    },
    onSuccess(newPendingOperation) {
      onRetryPost(comment, newPendingOperation);
    },
  });

  const deleteCommentMutation = useDeleteGaslessComment({
    connectedAddress,
  });

  const { mutate: deleteComment, reset: resetDeleteCommentMutation } =
    deleteCommentMutation;

  const handleDeleteClick = useCallback(() => {
    deleteComment({
      comment,
      submitIfApproved,
    });
  }, [comment, deleteComment, submitIfApproved]);

  const deleteCommentTransactionReceipt = useWaitForTransactionReceipt({
    hash: deleteCommentMutation.data,
  });

  useEffect(() => {
    if (deleteCommentTransactionReceipt.data?.status === "success") {
      onDeleteRef.current?.(commentRef.current.id);
      resetDeleteCommentMutation();
    }
  }, [
    deleteCommentTransactionReceipt.data?.status,
    commentRef,
    onDeleteRef,
    resetDeleteCommentMutation,
  ]);

  const postingCommentTxReceipt = useWaitForTransactionReceipt({
    hash: comment.pendingOperation?.txHash,
    chainId: comment.pendingOperation?.chainId,
  });

  useEffect(() => {
    if (postingCommentTxReceipt.data?.status === "success") {
      toast.success("Comment posted");
    }
  }, [postingCommentTxReceipt.data]);

  const isDeleting =
    deleteCommentMutation.isPending ||
    deleteCommentTransactionReceipt.isFetching;
  const didDeletingFailed = !isDeleting && deleteCommentMutation.isError;
  const isPosting = postingCommentTxReceipt.isFetching;
  const didPostingFailed =
    !isPosting && postingCommentTxReceipt.data?.status === "reverted";

  return (
    <CommentShared
      areRepliesAllowed={areRepliesAllowed}
      comment={comment}
      didDeletingFailed={didDeletingFailed}
      didPostingFailed={didPostingFailed}
      isDeleting={isDeleting}
      isPosting={isPosting}
      onReplyDelete={handleCommentDeleted}
      onReplyPost={handleRetryPostComment}
      onRetryDeleteClick={handleDeleteClick}
      onRetryPostClick={retryPostMutation.mutate}
      onReplySubmitSuccess={handleCommentSubmitted}
      level={level}
      ReplyComponent={CommentGasless}
      ReplyFormComponent={CommentGaslessForm}
      onDeleteClick={handleDeleteClick}
    />
  );
}
