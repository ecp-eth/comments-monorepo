"use client";

import React, { useMemo } from "react";
import { cn, formatAuthorLink } from "@/lib/utils";
import { type Comment as CommentType } from "@ecp.eth/shared/schemas";
import Link from "next/link";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import {
  getCommentAuthorNameOrAddress,
  formatDate,
} from "@ecp.eth/shared/helpers";
import { useCommentRelativeTime } from "@ecp.eth/shared/hooks";
import {
  CommentActionButton,
  CommentMediaReferences,
  CommentText,
  useConnectBeforeAction,
} from "@ecp.eth/shared/components";
import { useSetupPendingAction } from "./hooks/useSetupPendingAction";
import { createCommentItemsQueryKey } from "./queries/queryKeys";
import { useAccount, useChainId } from "wagmi";
import {
  EmbedConfigProviderByAuthorConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import { getConfiguredReactions } from "@/lib/reactions";
import { ReactionIcon } from "./ReactionIcon";

interface CommentByAuthorProps {
  comment: CommentType;
  /**
   * Used to calculate relative time in comments.
   */
  currentTimestamp: number;
}

export function CommentByAuthor({
  comment,
  currentTimestamp,
}: CommentByAuthorProps) {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const source = useEmbedConfig<EmbedConfigProviderByAuthorConfig>();
  const authorNameOrAddress = getCommentAuthorNameOrAddress(comment.author);
  const authorUrl = formatAuthorLink(comment.author);
  const commentRelativeTime = useCommentRelativeTime(
    comment.createdAt,
    currentTimestamp,
  );
  const queryKey = useMemo(
    () => createCommentItemsQueryKey(connectedAddress, chainId, source.author),
    [chainId, connectedAddress, source.author],
  );
  const reactions = useMemo(
    () => getConfiguredReactions(source.reactions),
    [source.reactions],
  );
  const connectBeforeAction = useConnectBeforeAction();

  const { isReactionPending } = useSetupPendingAction({
    comment,
    queryKey,
  });

  return (
    <div className="mb-4 border-l-2 border-muted pl-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <CommentAuthorAvatar author={comment.author} />
          <div className="flex flex-col justify-center gap-1">
            <div className="text-xs text-muted-foreground">
              {authorUrl ? (
                <Link
                  href={authorUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {authorNameOrAddress}
                </Link>
              ) : (
                <span>{authorNameOrAddress}</span>
              )}{" "}
              •{" "}
              <span title={formatDate(comment.createdAt)}>
                {commentRelativeTime}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              <Link
                className="truncate"
                href={comment.targetUri}
                rel="noopener noreferrer"
                target="_blank"
              >
                {comment.targetUri}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <CommentText
        className={cn(
          "mb-2 text-foreground break-words hyphens-auto",
          comment.deletedAt && "text-muted-foreground",
        )}
        content={comment.content}
        references={comment.references}
      />
      <CommentMediaReferences
        content={comment.content}
        references={comment.references}
      />
      <div className="mb-2 flex flex-wrap gap-2">
        {reactions.map((reaction) => {
          const isReacted =
            (comment.viewerReactions?.[reaction.value]?.length ?? 0) > 0;
          const pending = isReactionPending(reaction.value);

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
              <ReactionIcon icon={reaction.icon} />
              {comment.reactionCounts?.[reaction.value] ?? 0}
            </CommentActionButton>
          );
        })}
      </div>
    </div>
  );
}
