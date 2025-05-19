import type { Hex } from "viem";

export function createRootCommentsQueryKey(
  address: Hex | undefined,
  targetUri: string,
) {
  return ["comments", address, targetUri];
}

export function createCommentRepliesQueryKey(
  address: Hex | undefined,
  commentId: Hex,
) {
  return ["comments", address, commentId];
}
