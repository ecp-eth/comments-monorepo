import type { IndexerAPICommentWithRepliesSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { blo } from "blo";

export function Comment({
  comment,
}: {
  comment: IndexerAPICommentWithRepliesSchemaType;
}) {
  const nameOrAddress = getCommentAuthorNameOrAddress(comment.author);
  const name =
    comment.author.ens?.name || comment.author.farcaster?.displayName;
  const avatarUrl =
    comment.author.ens?.avatarUrl || comment.author.farcaster?.pfpUrl;

  return (
    <div className="flex items-end">
      <div className="flex-shrink-0 mr-2">
        <Avatar>
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={nameOrAddress} />
          ) : (
            <AvatarImage
              src={blo(comment.author.address)}
              alt={nameOrAddress}
            />
          )}

          <AvatarFallback>{name?.[0].toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
      </div>
      <div className="bg-white rounded-e-xl rounded-es-xl p-2 shadow-sm pl-4">
        <div className="truncate font-medium text-sm text-gray-800 max-w-[200px]">
          {nameOrAddress}
        </div>
        <div className="text-gray-900 text-base break-words">
          {comment.content}
        </div>
        <div>
          <span className="text-gray-500 text-xs">
            {new Date(comment.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-gray-500 text-xs ml-2">
            {new Date(comment.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
