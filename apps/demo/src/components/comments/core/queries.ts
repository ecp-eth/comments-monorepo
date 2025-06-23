import type { Hex } from "viem";

export function createRootCommentsQueryKey(
  author: Hex | undefined,
  targetUri: string,
) {
  return ["comments", author, targetUri];
}

export function createCommentRepliesQueryKey(
  author: Hex | undefined,
  commentId: Hex,
) {
  return ["comments", author, commentId];
}
