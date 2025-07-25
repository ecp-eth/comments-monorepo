import { Loader2Icon, MessageCircleWarningIcon } from "lucide-react";
import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { type PropsWithChildren } from "react";
import { useConnectBeforeAction } from "@ecp.eth/shared/components";
import {} from "@ecp.eth/shared/components";
import { cn } from "@ecp.eth/shared/helpers";
import { CommentActionButton } from "./CommentActionButton";
import { RetryButton } from "./RetryButton";
import { CommentActionLikeButton } from "./CommentActionLikeButton";

interface CommentActionOrStatusProps {
  comment: CommentType;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onRetryEditClick: () => void;
  isLiking?: boolean;
}

export function CommentActionOrStatus({
  comment,
  onRetryDeleteClick,
  onRetryPostClick,
  onRetryEditClick,
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

  const connectBeforeAction = useConnectBeforeAction();

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
    comment.pendingOperation &&
    comment.pendingOperation.state.status !== "success"
  ) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <CommentActionButton
        onClick={connectBeforeAction(() => {
          return {
            type: "prepareReply",
            commentId: comment.id,
          };
        })}
      >
        reply
      </CommentActionButton>
      <CommentActionLikeButton isLiking={isLiking} comment={comment} />
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
