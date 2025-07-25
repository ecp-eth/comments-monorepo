"use client";

import React from "react";
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
  CommentMediaReferences,
  CommentText,
} from "@ecp.eth/shared/components";
import { CommentActionLikeButton } from "./CommentActionLikeButton";
import { usePendingActionSetup } from "./hooks/usePendingActionSetup";

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
  const authorNameOrAddress = getCommentAuthorNameOrAddress(comment.author);
  const authorUrl = formatAuthorLink(comment.author);
  const commentRelativeTime = useCommentRelativeTime(
    comment.createdAt,
    currentTimestamp,
  );

  const { isLiking } = usePendingActionSetup({
    comment,
    queryKey: ["comments", comment.id],
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
      <div className="mb-2">
        <CommentActionLikeButton isLiking={isLiking} comment={comment} />
      </div>
    </div>
  );
}
