import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import useEnrichedAuthor from "@/hooks/useEnrichedAuthor";
import {
  getCommentAuthorNameOrAddress,
  formatDate,
} from "@ecp.eth/shared/helpers";
import Link from "next/link";
import { formatAuthorLink } from "@/lib/utils";
import { AuthorType } from "@ecp.eth/shared/types";
import { useCommentRelativeTime } from "@ecp.eth/shared/hooks";

type CommentAuthorProps = {
  author: AuthorType;
  timestamp: Date;
};

export function CommentAuthor({ author, timestamp }: CommentAuthorProps) {
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
        • <span title={formatDate(timestamp)}>{commentRelativeTime}</span>
      </div>
    </div>
  );
}
