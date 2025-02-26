import type { Comment } from "@/lib/schemas";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAuthorNameOrAddressFromComment } from "./helpers";
import { blo } from "blo";

type CommentAuthorAvatarProps = {
  comment: Comment;
};

export function CommentAuthorAvatar({ comment }: CommentAuthorAvatarProps) {
  const name =
    comment.author.ens?.name ?? comment.author.farcaster?.displayName;
  const nameOrAddress = getAuthorNameOrAddressFromComment(comment);
  const avatarUrl =
    comment.author.ens?.avatarUrl ?? comment.author.farcaster?.pfpUrl;

  return (
    <Avatar className="h-6 w-6">
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={`${nameOrAddress} Avatar`} />
      ) : (
        <AvatarImage src={blo(comment.author.address)} alt="Generated Avatar" />
      )}
      <AvatarFallback>{name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}
