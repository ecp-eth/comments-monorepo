import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import useEnrichedAuthor from "@/hooks/useEnrichedAuthor";
import {
  getCommentAuthorNameOrAddress,
  formatDate,
} from "@ecp.eth/shared/helpers";
import Link from "next/link";
import { cn, formatAuthorLink } from "@/lib/utils";
import { AuthorType } from "@ecp.eth/shared/types";
import { useCommentRelativeTime } from "@ecp.eth/shared/hooks";
import {
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from "../ui/tooltip";

type CommentAuthorProps = {
  author: AuthorType;
  moderationStatus: "pending" | "approved" | "rejected";
  timestamp: Date;
};

export function CommentAuthor({
  author,
  moderationStatus,
  timestamp,
}: CommentAuthorProps) {
  const enrichedAuthor = useEnrichedAuthor(author);
  const authorNameOrAddress = getCommentAuthorNameOrAddress(enrichedAuthor);
  const authorUrl = formatAuthorLink(enrichedAuthor);
  const commentRelativeTime = useCommentRelativeTime(timestamp, Date.now());

  return (
    <div className="flex items-center gap-2">
      <CommentAuthorAvatar author={enrichedAuthor} />
      <div className="text-xs text-gray-500">
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
          <span
            className={cn(
              status === "pending" ? "text-blue-500" : "text-red-500"
            )}
          >
            {status === "pending" ? "Pending moderation" : "Rejected"}
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
