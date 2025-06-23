import { Loader2Icon, MessageCircleWarningIcon } from "lucide-react";
import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { CommentActionButton } from "./CommentActionButton";
import { RetryButton } from "./RetryButton";
import { type PropsWithChildren, useMemo } from "react";
import { HeartButton } from "@ecp.eth/shared/components";
import { COMMENT_REACTION_LIKE_CONTENT } from "@/lib/constants";
import { cn } from "@ecp.eth/shared/helpers";

interface CommentActionOrStatusProps {
  comment: CommentType;
  hasAccountConnected: boolean;
  onReplyClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onRetryEditClick: () => void;
  onLikeClick: () => void;
  onUnlikeClick: () => void;
  isLiking?: boolean;
}

export function CommentActionOrStatus({
  comment,
  hasAccountConnected,
  onReplyClick,
  onRetryDeleteClick,
  onRetryPostClick,
  onRetryEditClick,
  onLikeClick,
  onUnlikeClick,
  isLiking,
}: CommentActionOrStatusProps) {
  const isDeleting =
    comment.pendingOperation?.action === "delete" &&
    comment.pendingOperation.state.status === "pending";
  const isPosting =
    comment.pendingOperation?.action === "post" &&
    comment.pendingOperation.state.status === "pending";
  const didDeletingFailed =
    comment.pendingOperation?.action === "delete" &&
    comment.pendingOperation.state.status === "error";
  const didPostingFailed =
    comment.pendingOperation?.action === "post" &&
    comment.pendingOperation.state.status === "error";
  const didEditingFailed =
    comment.pendingOperation?.action === "edit" &&
    comment.pendingOperation.state.status === "error";
  const isEditing =
    comment.pendingOperation?.action === "edit" &&
    comment.pendingOperation.state.status === "pending";

  const likedByViewer = useMemo(() => {
    return (
      (comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT]?.length ?? 0) >
      0
    );
  }, [comment.viewerReactions]);

  if (didPostingFailed) {
    return (
      <ButtonStatus>
        <MessageCircleWarningIcon className="w-3 h-3" />
        <span>
          Could not post the comment.{" "}
          <RetryButton onClick={onRetryPostClick}>Retry</RetryButton>
        </span>
      </ButtonStatus>
    );
  }

  if (didDeletingFailed) {
    return (
      <ButtonStatus>
        <MessageCircleWarningIcon className="w-3 h-3" />
        <span>
          Could not delete the comment.{" "}
          <RetryButton onClick={onRetryDeleteClick}>Retry</RetryButton>
        </span>
      </ButtonStatus>
    );
  }

  if (didEditingFailed) {
    return (
      <ButtonStatus>
        <MessageCircleWarningIcon className="w-3 h-3" />
        <span>
          Could not edit the comment.{" "}
          <RetryButton onClick={onRetryEditClick}>Retry</RetryButton>
        </span>
      </ButtonStatus>
    );
  }

  if (isDeleting) {
    return (
      <ButtonStatus muted={true}>
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Deleting...</span>
      </ButtonStatus>
    );
  }

  if (isEditing) {
    return (
      <ButtonStatus muted={true}>
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Editing...</span>
      </ButtonStatus>
    );
  }

  if (isPosting) {
    return (
      <ButtonStatus muted={true}>
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Posting...</span>
      </ButtonStatus>
    );
  }

  if (
    (comment.pendingOperation &&
      comment.pendingOperation.state.status !== "success") ||
    !hasAccountConnected
  ) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <CommentActionButton onClick={onReplyClick}>reply</CommentActionButton>
      <CommentActionButton>
        <HeartButton
          pending={isLiking}
          onIsHeartedChange={(isHearted) => {
            if (isHearted) {
              onLikeClick();
            } else {
              onUnlikeClick();
            }
          }}
          isHearted={likedByViewer}
        />

        {comment.reactionCounts?.[COMMENT_REACTION_LIKE_CONTENT] ?? 0}
      </CommentActionButton>
    </div>
  );
}

function ButtonStatus({
  muted = false,
  children,
}: PropsWithChildren<{ muted?: boolean }>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs",
        muted ? "text-muted-foreground" : "text-destructive",
      )}
    >
      {children}
    </div>
  );
}
