import useEnrichedAuthor from "@/hooks/useEnrichedAuthor";
import { AuthorType } from "@/lib/types";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";

export function CommentBoxAuthor(author: AuthorType) {
  const enrichedAuthor = useEnrichedAuthor(author);

  return (
    <div
      className="flex flex-row gap-2 items-center"
      title={`Publishing as ${getCommentAuthorNameOrAddress(enrichedAuthor)}`}
    >
      <CommentAuthorAvatar author={enrichedAuthor} />
      <div className="text-xs text-gray-500">
        {getCommentAuthorNameOrAddress(enrichedAuthor)}
      </div>
    </div>
  );
}
