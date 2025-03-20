import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import {
  getCommentAuthorNameOrAddress,
  formatDate,
  formatDateRelative,
} from "@ecp.eth/shared/helpers";
import { formatAuthorLink } from "@/lib/utils";
import Link from "next/link";
import { AuthorType } from "@ecp.eth/shared/types";

type CommentAuthorProps = {
  author: AuthorType;
  timestamp: Date;
  currentTimestamp: number;
};

export function CommentAuthor({
  author,
  timestamp,
  currentTimestamp,
}: CommentAuthorProps) {
  const authorNameOrAddress = getCommentAuthorNameOrAddress(author);
  const authorUrl = formatAuthorLink(author);

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
        •{" "}
        <span title={formatDate(timestamp)}>
          {formatDateRelative(timestamp, currentTimestamp)}
        </span>
      </div>
    </div>
  );
}
