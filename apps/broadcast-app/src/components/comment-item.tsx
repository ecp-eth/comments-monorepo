"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HeartIcon, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  IndexerAPICommentWithRepliesSchemaType,
  IndexerAPICommentSchemaType,
} from "@ecp.eth/sdk/indexer";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { renderToReact } from "@ecp.eth/shared/renderer";
import { blo } from "blo";
import { CommentMediaReferences } from "@ecp.eth/shared/components/CommentMediaReferences";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { useCommentIsHearted } from "@ecp.eth/shared/hooks";

interface CommentItemProps {
  comment: IndexerAPICommentWithRepliesSchemaType | IndexerAPICommentSchemaType;
  onReply: (comment: IndexerAPICommentSchemaType) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  onReply,
  isReply = false,
}: CommentItemProps) {
  const isHearted = useCommentIsHearted(comment);
  const nameOrAddress = getCommentAuthorNameOrAddress(comment.author);
  const avatarUrl =
    comment.author.ens?.avatarUrl || comment.author.farcaster?.pfpUrl;

  const { element, isTruncated, mediaReferences } = useMemo(() => {
    return renderToReact({
      content: comment.content,
      references: comment.references,
      maxLength: 200,
      maxLines: 5,
    });
  }, [comment.content, comment.references]);

  const [showFullContent, setShowFullContent] = useState(isTruncated);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={cn(
        "space-y-3",
        isReply && "ml-8 pl-4 border-l-2 border-muted",
      )}
    >
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8 shrink-0">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={nameOrAddress} />
          ) : (
            <AvatarImage
              src={blo(comment.author.address)}
              alt={nameOrAddress}
            />
          )}
          <AvatarFallback>
            {nameOrAddress.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{nameOrAddress}</span>
            <span>•</span>
            <span>{formatDate(comment.createdAt)}</span>
            {comment.updatedAt !== comment.createdAt && (
              <>
                <span>•</span>
                <span>edited</span>
              </>
            )}
          </div>

          <div className="text-sm">
            <p className="whitespace-pre-wrap break-words">{element}</p>
            {isTruncated && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => setShowFullContent(!showFullContent)}
              >
                {showFullContent ? "Hide" : "Show more"}
              </Button>
            )}
          </div>

          {mediaReferences.length > 0 && (
            <div className="mt-2">
              <CommentMediaReferences
                content={comment.content}
                references={comment.references}
              />
            </div>
          )}

          <div className="flex items-center space-x-4 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto p-0 text-xs space-x-1",
                comment && "text-red-500",
              )}
              onClick={() => {
                // @todo: handle like
              }}
            >
              <HeartIcon
                className={cn("h-3 w-3", isHearted && "fill-current")}
              />
              <span>
                {"reactionCounts" in comment
                  ? (comment.reactionCounts?.[COMMENT_REACTION_LIKE_CONTENT] ??
                    0)
                  : 0}
              </span>
            </Button>

            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs space-x-1"
                onClick={() => onReply(comment)}
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {"replies" in comment && comment.replies.results.length > 0 && (
        <div className="space-y-3">
          {comment.replies.results.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
