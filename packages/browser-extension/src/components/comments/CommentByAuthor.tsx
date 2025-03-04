"use client";

import React from "react";
import { cn, formatDate } from "@/lib/utils";
import { type Comment as CommentType } from "@/lib/schemas";
import { CommentText } from "./CommentText";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getAuthorNameOrAddressFromComment } from "./helpers";

interface CommentByAuthorProps {
  comment: CommentType;
}

export function CommentByAuthor({ comment }: CommentByAuthorProps) {
  return (
    <div className="mb-4 border-l-2 border-muted pl-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <CommentAuthorAvatar comment={comment} />
          <div className="flex flex-col justify-center gap-1">
            <div className="text-xs text-muted-foreground">
              {getAuthorNameOrAddressFromComment(comment)} •{" "}
              {formatDate(comment.timestamp)}
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
