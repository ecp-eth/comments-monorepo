import { useEnrichedAuthor } from "@/hooks/useEnrichedAuthor";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { AuthorType } from "@ecp.eth/shared/types";

export function CommentBoxAuthor(author: AuthorType) {
  const enrichedAuthor = useEnrichedAuthor(author);

  return (
    <div
      className="flex flex-row gap-2 items-center overflow-hidden"
      title={`Publishing as ${getCommentAuthorNameOrAddress(enrichedAuthor)}`}
    >
      <CommentAuthorAvatar author={enrichedAuthor} />
      <div className="flex-grow text-xs text-gray-500 truncate">
        {getCommentAuthorNameOrAddress(enrichedAuthor)}
      </div>
    </div>
  );
}
