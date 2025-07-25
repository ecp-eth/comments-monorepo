import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { useCommentIsHearted } from "@ecp.eth/shared/hooks";
import {
  HeartButton,
  useConnectBeforeAction,
} from "@ecp.eth/shared/components";
import { CommentActionButton } from "./CommentActionButton";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";

type CommentLikeButtonProps = {
  comment: CommentType;
  isLiking?: boolean;
};

export function CommentActionLikeButton({
  comment,
  isLiking,
}: CommentLikeButtonProps) {
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
