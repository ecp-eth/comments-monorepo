import { Loader2Icon, MessageCircleWarningIcon } from "lucide-react";
import { CommentActionButton } from "./CommentActionButton";
import type { Comment } from "@/lib/schemas";

export function CommentActionOrStatus({
  comment,
  hasAccountConnected,
  onReplyClick,
  onRetryDeleteClick,
  onRetryPostClick,
}: {
  comment: Comment;
  hasAccountConnected: boolean;
  onReplyClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
}) {
  const isDeleting = comment.pendingOperation?.action === "delete";
  const isPosting = comment.pendingOperation?.action === "post";
  const didDeletingFailed =
    comment.pendingOperation?.action === "delete" &&
    comment.pendingOperation.state.status === "error";
  const didPostingFailed =
    comment.pendingOperation?.action === "post" &&
    comment.pendingOperation.state.status === "error";

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

  if (isDeleting) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Deleting...</span>
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

type RetryButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
};

function RetryButton({ children, onClick }: RetryButtonProps) {
  return (
    <button
      className="inline-flex items-center justify-center font-semibold transition-colors rounded-md hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
