import type { AuthorType } from "@/lib/types";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import useEnrichedAuthor from "@/hooks/useEnrichedAuthor";
import {
  getCommentAuthorNameOrAddress,
  formatDate,
  formatDateRelative,
} from "@ecp.eth/shared/helpers";
import { publicEnv } from "@/publicEnv";
import Link from "next/link";

function formatAuthorLink(author: AuthorType): string | null {
  if (!publicEnv.NEXT_PUBLIC_COMMENT_AUTHOR_URL) {
    return null;
  }

  const url = publicEnv.NEXT_PUBLIC_COMMENT_AUTHOR_URL.replace(
    "{address}",
    author.address
  );

  return URL.canParse(url) ? url : null;
}

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
