import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import {
  getCommentAuthorNameOrAddress,
  formatDate,
} from "@ecp.eth/shared/helpers";
import { cn, formatAuthorLink } from "@/lib/utils";
import Link from "next/link";
import { AuthorType } from "@ecp.eth/shared/types";
import { useCommentRelativeTime } from "@ecp.eth/shared/hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { IndexerAPICommentModerationStatusSchemaType } from "@ecp.eth/sdk/indexer/schemas";

type CommentAuthorProps = {
  author: AuthorType;
  timestamp: Date;
  currentTimestamp: number;
  moderationStatus: IndexerAPICommentModerationStatusSchemaType;
};

export function CommentAuthor({
  author,
  timestamp,
  currentTimestamp,
  moderationStatus,
}: CommentAuthorProps) {
  const authorNameOrAddress = getCommentAuthorNameOrAddress(author);
  const authorUrl = formatAuthorLink(author);
  const commentRelativeTime = useCommentRelativeTime(
    timestamp,
    currentTimestamp,
  );

  return (
    <div className="flex items-center gap-2">
      <CommentAuthorAvatar author={author} />
      <div className="text-xs text-muted-foreground">
        {authorUrl ? (
          <Link href={authorUrl} rel="noreferrer noopener" target="_blank">
            {authorNameOrAddress}
          </Link>
        ) : (
          <span>{authorNameOrAddress}</span>
        )}{" "}
        {moderationStatus !== "approved" && (
          <>
            • <ModerationLabel status={moderationStatus} />{" "}
          </>
        )}
        • <span title={formatDate(timestamp)}>{commentRelativeTime}</span>
      </div>
    </div>
  );
}

function ModerationLabel({ status }: { status: "pending" | "rejected" }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(status === "rejected" && "text-destructive")}>
            {status === "pending" ? "pending moderation" : "rejected"}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === "pending"
              ? "Your comment is pending moderation. At the moment it is visible only to you."
              : "Your comment was rejected. Comment is visible only to you."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
