import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { Comment } from "./Comment";
import { useCallback, useState } from "react";
import { CommentForm } from "./CommentForm";
import { useDeleteComment } from "./hooks/useDeleteComment";
import { useRetryPostComment } from "./hooks/useRetryPostComment";
import type { Hex } from "viem";
import type { QueryKey } from "@tanstack/react-query";

type ReplyItemProps = {
  connectedAddress: Hex | undefined;
  comment: CommentType;
  queryKey: QueryKey;
};

export function ReplyItem({
  connectedAddress,
  comment,
  queryKey,
}: ReplyItemProps) {
  const deleteComment = useDeleteComment();
  const retryPostComment = useRetryPostComment({ connectedAddress });
  const [isReplying, setIsReplying] = useState(false);

  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const onDeleteClick = useCallback(() => {
    deleteComment({ commentId: comment.id, queryKey });
  }, [comment, deleteComment, queryKey]);

  const onRetryPostClick = useCallback(() => {
    retryPostComment({ comment, queryKey });
  }, [comment, retryPostComment, queryKey]);

  return (
    <div className="mb-4 border-muted border-l-2 pl-4">
      <Comment
        comment={comment}
        onReplyClick={onReplyClick}
        onRetryPostClick={onRetryPostClick}
        onDeleteClick={onDeleteClick}
        onRetryDeleteClick={onDeleteClick}
      />
      {isReplying && (
        <CommentForm
          autoFocus
          onLeftEmpty={() => {
            setIsReplying(false);
          }}
          onSubmitStart={() => {
            setIsReplying(false);
          }}
          placeholder="What are your thoughts?"
          parentId={comment.id}
        />
      )}
    </div>
  );
}
