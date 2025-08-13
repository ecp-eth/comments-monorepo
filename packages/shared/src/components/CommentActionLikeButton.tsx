import { CommentActionButton } from "./CommentActionButton";
import { useConnectBeforeAction } from "./PendingWalletConnectionActionsContext";
import { HeartButton } from "./HeartButton";
import type { Comment as CommentType } from "../schemas";
import { useCommentIsHearted } from "../hooks";
import { COMMENT_REACTION_LIKE_CONTENT } from "../constants";

type CommentActionLikeButtonProps = {
  comment: CommentType;
  isLiking?: boolean;
};

export function CommentActionLikeButton({
  comment,
  isLiking,
}: CommentActionLikeButtonProps) {
  const isHearted = useCommentIsHearted(comment);
  const connectBeforeAction = useConnectBeforeAction();

  return (
    <CommentActionButton
      onClick={connectBeforeAction(() => {
        const newIsHearted = !isHearted;

        return {
          type: newIsHearted ? "like" : "unlike",
          commentId: comment.id,
        };
      })}
    >
      <HeartButton pending={isLiking} isHearted={isHearted} />
      {comment.reactionCounts?.[COMMENT_REACTION_LIKE_CONTENT] ?? 0}
    </CommentActionButton>
  );
}
