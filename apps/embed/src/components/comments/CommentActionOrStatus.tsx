import { Loader2Icon, MessageCircleWarningIcon } from "lucide-react";
import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { CommentActionButton } from "./CommentActionButton";
import { RetryButton } from "./RetryButton";

interface CommentActionOrStatusProps {
  comment: CommentType;
  hasAccountConnected: boolean;
  onReplyClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onRetryEditClick: () => void;
}

export function CommentActionOrStatus({
  comment,
  hasAccountConnected,
  onReplyClick,
  onRetryDeleteClick,
  onRetryPostClick,
  onRetryEditClick,
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

  if (didPostingFailed) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <MessageCircleWarningIcon className="w-3 h-3" />
        <span>
          Could not post the comment.{" "}
          <RetryButton onClick={onRetryPostClick}>Retry</RetryButton>
        </span>
      </div>
    );
  }

  if (didDeletingFailed) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <MessageCircleWarningIcon className="w-3 h-3" />
        <span>
          Could not delete the comment.{" "}
          <RetryButton onClick={onRetryDeleteClick}>Retry</RetryButton>
        </span>
      </div>
    );
  }

  if (didEditingFailed) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <MessageCircleWarningIcon className="w-3 h-3" />
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Deleting...</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Editing...</span>
      </div>
    );
  }

  if (isPosting) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Posting...</span>
      </div>
    );
  }

  if (comment.pendingOperation || !hasAccountConnected) {
    return null;
  }

  return (
    <CommentActionButton onClick={onReplyClick}>reply</CommentActionButton>
  );
}
