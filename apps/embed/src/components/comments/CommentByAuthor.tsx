"use client";

import React, { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { type Comment as CommentType } from "@/lib/schemas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { blo } from "blo";
import { TRUNCATE_COMMENT_LENGTH } from "@/lib/constants";
import Link from "next/link";

interface CommentByAuthorProps {
  comment: CommentType;
}

export function CommentByAuthor({ comment }: CommentByAuthorProps) {
  return (
    <div className="mb-4 border-l-2 border-muted pl-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <AuthorAvatar author={comment.author} />
          <div className="flex flex-col justify-center gap-1">
            <div className="text-xs text-muted-foreground">
              {getAuthorNameOrAddress(comment.author)} •{" "}
              {formatDate(comment.timestamp)}
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

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim() + "...";
}

function CommentText({ text }: { text: string }) {
  const [shownText, setShownText] = useState(
    truncateText(text, TRUNCATE_COMMENT_LENGTH)
  );
  const isTruncated = text.length > shownText.length;

  return (
    <>
      {shownText}
      {isTruncated ? (
        <>
          {" "}
          <button
            onClick={() => setShownText(text)}
            className="text-accent-foreground inline whitespace-nowrap underline"
            type="button"
          >
            Show more
          </button>
        </>
      ) : null}
    </>
  );
}

function getAuthorNameOrAddress(author: CommentType["author"]): string {
  return author.ens?.name ?? author.farcaster?.displayName ?? author.address;
}

type AuthorAvatarProps = {
  author: CommentType["author"];
};

function AuthorAvatar({ author }: AuthorAvatarProps) {
  const name = author.ens?.name ?? author.farcaster?.displayName;
  const nameOrAddress = getAuthorNameOrAddress(author);
  const avatarUrl = author.ens?.avatarUrl ?? author.farcaster?.pfpUrl;

  return (
    <Avatar className="h-6 w-6">
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={`${nameOrAddress} Avatar`} />
      ) : (
        <AvatarImage src={blo(author.address)} alt="Generated Avatar" />
      )}
      <AvatarFallback>{name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}
