import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { Comment } from "./Comment";
import { useCallback, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { useCommentActions } from "./CommentActionsContext";
import type { Hex } from "viem";

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
  const { deleteComment, retryPostComment, retryEditComment } =
    useCommentActions();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
