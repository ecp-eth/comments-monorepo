import type { CommentType } from "@/lib/types";
import { abbreviateAddressForDisplay } from "@/lib/utils";

export function getCommentAuthorNameOrAddress(
  author: CommentType["author"]
): string {
  return (
    author.ens?.name ??
    author.farcaster?.displayName ??
    abbreviateAddressForDisplay(author.address)
  );
}
