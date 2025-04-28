import { publicEnv } from "@/publicEnv";
import { fetchAuthorData } from "@ecp.eth/sdk/indexer";
import { AuthorType } from "@ecp.eth/shared/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Return author data enriched with ens and farcaster data (if they are not already provided)
 * @param author
 */
export function useEnrichedAuthor(author: AuthorType): AuthorType {
  const { address } = author;
  const { data: authorData } = useQuery({
    queryKey: ["author", address],
    queryFn: () => {
      return fetchAuthorData({
        address,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      });
    },
    // only fetch author data if the comment author doesn't already have an ens or farcaster display name
    enabled: !author.ens && !author.farcaster,
  });

  return {
    ...author,
    ...authorData,
  };
}
