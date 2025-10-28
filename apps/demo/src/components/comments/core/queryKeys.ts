import type { Hex } from "viem";

export function createCommentItemsQueryKey(
  author: Hex | undefined,
  targetUri: string,
) {
  return ["comments", author, targetUri];
}

export function createReplyItemsQueryKey(
  author: Hex | undefined,
  commentId: Hex,
) {
  return ["comments", author, commentId];
}
