import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { Comment } from "./Comment";
import { useCallback, useState } from "react";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { useDeleteComment } from "./hooks/useDeleteComment";
import { useRetryPostComment } from "./hooks/useRetryPostComment";
import { useRetryEditComment } from "./hooks/useRetryEditComment";
import type { QueryKey } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useSetupPendingAction } from "./hooks/useSetupPendingAction";

type ReplyItemProps = {
  comment: CommentType;
  queryKey: QueryKey;
};

export function ReplyItem({ comment, queryKey }: ReplyItemProps) {
  const { address: connectedAddress } = useAccount();
  const deleteComment = useDeleteComment();
  const retryPostComment = useRetryPostComment({ connectedAddress });
  const retryEditComment = useRetryEditComment({ connectedAddress });

  const [isEditing, setIsEditing] = useState(false);

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

  const { isLiking, isReplying, setIsReplying } = useSetupPendingAction({
    comment,
    queryKey,
  });

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
          // because we support flat mode on api now, no need to always set to root comment id
          parentId={comment.id}
          queryKey={queryKey}
        />
      )}
    </div>
  );
}
