import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { Comment } from "./Comment";
import { useCallback, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { CommentForm } from "./CommentForm";
import { useCommentActions } from "./CommentActionsContext";

type ReplyItemProps = {
  comment: CommentType;
  queryKey: QueryKey;
};

export function ReplyItem({ comment, queryKey }: ReplyItemProps) {
  const { deleteComment, retryPostComment } = useCommentActions();
  const [isReplying, setIsReplying] = useState(false);

  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const onDeleteClick = useCallback(() => {
    deleteComment({ comment, queryKey });
  }, [comment, deleteComment, queryKey]);

  const onRetryPostClick = useCallback(() => {
    retryPostComment({ comment, queryKey });
  }, [comment, retryPostComment, queryKey]);

  return (
    <div className={"mb-4 border-gray-200 border-l-2 pl-4"}>
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
          queryKey={queryKey}
        />
      )}
    </div>
  );
}
