import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { blo } from "blo";
import { useEnrichedAuthor } from "@/hooks/useEnrichedAuthor";
import { AuthorType } from "@ecp.eth/shared/types";

type CommentAuthorAvatarProps = {
  author: AuthorType;
};

export function CommentAuthorAvatar({ author }: CommentAuthorAvatarProps) {
  const enrichedAuthor = useEnrichedAuthor(author);
  const name =
    enrichedAuthor.ens?.name ?? enrichedAuthor.farcaster?.displayName;
  const nameOrAddress = getCommentAuthorNameOrAddress(enrichedAuthor);
  const avatarUrl =
    enrichedAuthor.ens?.avatarUrl ?? enrichedAuthor.farcaster?.pfpUrl;

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
