import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import useEnrichedAuthor from "@/hooks/useEnrichedAuthor";
import {
  getCommentAuthorNameOrAddress,
  formatDate,
  formatDateRelative,
} from "@ecp.eth/shared/helpers";
import Link from "next/link";
import { formatAuthorLink } from "@/lib/utils";
import { AuthorType } from "@ecp.eth/shared/types";

type CommentAuthorProps = {
  author: AuthorType;
  timestamp: Date;
};

export function CommentAuthor({ author, timestamp }: CommentAuthorProps) {
  const enrichedAuthor = useEnrichedAuthor(author);
  const authorNameOrAddress = getCommentAuthorNameOrAddress(enrichedAuthor);
  const authorUrl = formatAuthorLink(enrichedAuthor);

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
        •{" "}
        <span title={formatDate(timestamp)}>
          {formatDateRelative(timestamp, Date.now())}
        </span>
      </div>
    </div>
  );
}
