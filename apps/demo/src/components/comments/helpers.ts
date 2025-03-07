import type { CommentType } from "@/lib/types";

export function getCommentAuthorNameOrAddress(
  author: CommentType["author"]
): string {
  return author.ens?.name ?? author.farcaster?.displayName ?? author.address;
}
