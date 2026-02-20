import { Loader2Icon, MessageCircleWarningIcon } from "lucide-react";
import type { Comment as CommentType } from "@ecp.eth/shared/schemas";
import { type PropsWithChildren, useMemo } from "react";
import {
  CommentActionButton,
  useConnectBeforeAction,
} from "@ecp.eth/shared/components";
import { cn } from "@ecp.eth/shared/helpers";
import { RetryButton } from "./RetryButton";
import { useEmbedConfig } from "../EmbedConfigProvider";
import { getConfiguredReactions } from "@/lib/reactions";
import { ReactionIcon } from "./ReactionIcon";

interface CommentActionOrStatusProps {
  comment: CommentType;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onRetryEditClick: () => void;
  isReactionPending?: (reactionType: string) => boolean;
}

export function CommentActionOrStatus({
  comment,
  onRetryDeleteClick,
  onRetryPostClick,
  onRetryEditClick,
  isReactionPending,
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
  const config = useEmbedConfig();
  const reactions = useMemo(
    () => getConfiguredReactions(config.reactions),
    [config.reactions],
  );

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
    <div className="flex flex-wrap items-center gap-2">
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
      {reactions.map((reaction) => {
        const isReacted =
          (comment.viewerReactions?.[reaction.value]?.length ?? 0) > 0;
        const count = comment.reactionCounts?.[reaction.value] ?? 0;
        const pending = isReactionPending?.(reaction.value) ?? false;

        return (
          <CommentActionButton
            key={`${comment.id}-${reaction.value}`}
            className={cn(
              "gap-1 px-1.5 py-0.5",
              isReacted && "text-accent-foreground",
            )}
            disabled={pending}
            onClick={connectBeforeAction(() => {
              return {
                type: isReacted ? "unreact" : "react",
                commentId: comment.id,
                reactionType: reaction.value,
              };
            })}
          >
            {pending ? (
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ReactionIcon icon={reaction.icon} />
            )}
            {count}
          </CommentActionButton>
        );
      })}
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
