import { type Comment } from "@ecp.eth/shared/schemas";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { blo } from "blo";

type CommentAuthorAvatarProps = {
  author: Comment["author"];
};

export function CommentAuthorAvatar({ author }: CommentAuthorAvatarProps) {
  const name = author.ens?.name ?? author.farcaster?.displayName;
  const nameOrAddress = getCommentAuthorNameOrAddress(author);
  const avatarUrl = author.ens?.avatarUrl ?? author.farcaster?.pfpUrl;

  return (
    <Avatar className="h-6 w-6">
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={`${nameOrAddress} Avatar`} />
      ) : (
        <AvatarImage src={blo(author.address)} alt="Generated Avatar" />
      )}
      <AvatarFallback>{name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}
