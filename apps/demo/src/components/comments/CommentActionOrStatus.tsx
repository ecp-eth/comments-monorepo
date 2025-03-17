import { Loader2Icon, MessageCircleWarningIcon } from "lucide-react";
import { CommentActionButton } from "./CommentActionButton";
import { type Comment as CommentType } from "@ecp.eth/shared/schemas";

export function CommentActionOrStatus({
  comment,
  hasAccountConnected,
  hasRepliesAllowed,
  isDeleting,
  isPosting,
  postingFailed,
  deletingFailed,
  onReplyClick,
  onRetryDeleteClick,
  onRetryPostClick,
}: {
  comment: CommentType;
  hasAccountConnected: boolean;
  hasRepliesAllowed: boolean;
  isDeleting: boolean;
  isPosting: boolean;
  postingFailed: boolean;
  deletingFailed: boolean;
  onReplyClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
}) {
  if (postingFailed) {
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

  if (deletingFailed) {
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

  if (comment.pendingOperation || !hasAccountConnected || !hasRepliesAllowed) {
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
