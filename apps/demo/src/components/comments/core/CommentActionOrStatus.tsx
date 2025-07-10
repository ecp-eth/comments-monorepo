import { Loader2Icon, MessageCircleWarningIcon } from "lucide-react";
import { CommentActionButton } from "./CommentActionButton";
import type { Comment } from "@ecp.eth/shared/schemas";
import { type PropsWithChildren } from "react";
import { cn } from "@ecp.eth/shared/helpers";
import {
  HeartButton,
  useConnectBeforeAction,
} from "@ecp.eth/shared/components";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { useReportCommentDialog } from "./ReportCommentDialogProvider";
import { useCommentIsHearted } from "@ecp.eth/shared/hooks";

export function CommentActionOrStatus({
  comment,
  onRetryDeleteClick,
  onRetryPostClick,
  onRetryEditClick,
  isLiking,
}: {
  comment: Comment;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onRetryEditClick: () => void;
  isLiking?: boolean;
}) {
  const isDeleting =
    comment.pendingOperation?.action === "delete" &&
    comment.pendingOperation.state.status === "pending";
  const isEditing =
    comment.pendingOperation?.action === "edit" &&
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

  const isHearted = useCommentIsHearted(comment);
  const { open } = useReportCommentDialog();
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

      <CommentActionButton
        onClick={connectBeforeAction(() => {
          open(comment);
        })}
      >
        report
      </CommentActionButton>
    </div>
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

function ButtonStatus({
  muted = false,
  children,
}: PropsWithChildren<{ muted?: boolean }>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        muted ? "text-muted-foreground" : "text-destructive",
      )}
    >
      {children}
    </div>
  );
}
