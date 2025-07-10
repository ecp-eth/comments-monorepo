import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { Comment } from "./Comment";
import { useCallback, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { useCommentActions } from "./CommentActionsContext";
import { ContractFunctionExecutionError, type Hex } from "viem";
import { toast } from "sonner";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { useConsumePendingWalletConnectionActions } from "@ecp.eth/shared/components";

type ReplyItemProps = {
  comment: CommentType;
  queryKey: QueryKey;
  /**
   * The id of the parent comment to update.
   */
  parentCommentId: Hex;
};

export function ReplyItem({
  comment,
  queryKey,
  parentCommentId,
}: ReplyItemProps) {
  const {
    deleteComment,
    retryPostComment,
    retryEditComment,
    likeComment,
    unlikeComment,
  } = useCommentActions();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const onEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const onDeleteClick = useCallback(() => {
    deleteComment({ comment, queryKey });
  }, [comment, deleteComment, queryKey]);

  const onRetryPostClick = useCallback(() => {
    retryPostComment({ comment, queryKey });
  }, [comment, retryPostComment, queryKey]);

  const onRetryEditClick = useCallback(() => {
    retryEditComment({ comment, queryKey });
  }, [comment, retryEditComment, queryKey]);

  const onLikeClick = useCallback(() => {
    likeComment({
      comment,
      queryKey,
      onBeforeStart: () => setIsLiking(true),
      onSuccess: () => setIsLiking(false),
      onFailed: (e: unknown) => {
        setIsLiking(false);

        if (!(e instanceof Error)) {
          toast.error("Failed to like");
          return;
        }

        const message =
          e instanceof ContractFunctionExecutionError
            ? formatContractFunctionExecutionError(e)
            : e.message;

        toast.error(message);
      },
    });
  }, [comment, likeComment, queryKey]);

  const onUnlikeClick = useCallback(() => {
    unlikeComment({
      comment,
      queryKey,
      onBeforeStart: () => setIsLiking(false),
      onFailed: (e: unknown) => {
        setIsLiking(false);

        if (!(e instanceof Error)) {
          toast.error("Failed to like");
          return;
        }

        const message =
          e instanceof ContractFunctionExecutionError
            ? formatContractFunctionExecutionError(e)
            : e.message;

        toast.error(message);
      },
    });
  }, [comment, unlikeComment, queryKey]);

  useConsumePendingWalletConnectionActions({
    commentId: comment.id,
    onLikeAction: onLikeClick,
    onUnlikeAction: onUnlikeClick,
  });

  return (
    <div className={"mb-4 border-gray-200 border-l-2 pl-4"}>
      {isEditing ? (
        <CommentEditForm
          queryKey={queryKey}
          comment={comment}
          onCancel={() => {
            setIsEditing(false);
          }}
          onSubmitStart={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <Comment
          comment={comment}
          onReplyClick={onReplyClick}
          onRetryPostClick={onRetryPostClick}
          onDeleteClick={onDeleteClick}
          onRetryDeleteClick={onDeleteClick}
          onEditClick={onEditClick}
          onRetryEditClick={onRetryEditClick}
          isLiking={isLiking}
          optimisticReferences={
            comment.pendingOperation?.action === "post"
              ? comment.pendingOperation.references
              : undefined
          }
        />
      )}
      {isReplying && (
        <CommentForm
          autoFocus
          onCancel={() => {
            setIsReplying(false);
          }}
          onSubmitStart={() => {
            setIsReplying(false);
          }}
          parentId={parentCommentId}
        />
      )}
    </div>
  );
}
