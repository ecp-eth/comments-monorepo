"use client";

import React from "react";
import {
  cn,
  formatAuthorLink,
  formatDate,
  formatDateRelative,
} from "@/lib/utils";
import { type Comment as CommentType } from "@/lib/schemas";
import Link from "next/link";
import { CommentText } from "./CommentText";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "./helpers";

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
              <span title={formatDate(comment.timestamp)}>
                {formatDateRelative(comment.timestamp, currentTimestamp)}
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
      <div
        className={cn(
          "mb-2 text-foreground",
          comment.deletedAt && "text-muted-foreground"
        )}
      >
        <CommentText
          // make sure comment is updated if was deleted
          key={comment.deletedAt?.toISOString()}
          text={comment.content}
        />
      </div>
    </div>
  );
}
