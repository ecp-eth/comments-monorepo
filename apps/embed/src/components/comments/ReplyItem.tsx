import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { Comment } from "./Comment";
import { useCallback, useState } from "react";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { useDeleteComment } from "./hooks/useDeleteComment";
import { useRetryPostComment } from "./hooks/useRetryPostComment";
import { useRetryEditComment } from "./hooks/useRetryEditComment";
import type { Hex } from "viem";
import type { QueryKey } from "@tanstack/react-query";

type ReplyItemProps = {
  connectedAddress: Hex | undefined;
  comment: CommentType;
  queryKey: QueryKey;
  parentCommentId: Hex;
};

export function ReplyItem({
  connectedAddress,
  comment,
  queryKey,
  parentCommentId,
}: ReplyItemProps) {
  const deleteComment = useDeleteComment();
  const retryPostComment = useRetryPostComment({ connectedAddress });
  const retryEditComment = useRetryEditComment({ connectedAddress });
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const onEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const onDeleteClick = useCallback(() => {
    deleteComment({ commentId: comment.id, queryKey });
  }, [comment, deleteComment, queryKey]);

  const onRetryPostClick = useCallback(() => {
    retryPostComment({ comment, queryKey });
  }, [comment, retryPostComment, queryKey]);

  const onRetryEditClick = useCallback(() => {
    retryEditComment({ comment, queryKey });
  }, [comment, retryEditComment, queryKey]);

  return (
    <div className="mb-4 border-muted border-l-2 pl-4">
      {isEditing ? (
        <CommentEditForm
          comment={comment}
          queryKey={queryKey}
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
          // make sure to update replies on top level comment because we are using flat replies mode
          parentId={parentCommentId}
        />
      )}
    </div>
  );
}
