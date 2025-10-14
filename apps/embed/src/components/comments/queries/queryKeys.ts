import { Hex } from "viem";

export function createCommentItemsQueryKey(
  viewer: Hex | undefined,
  chainId: number,
  targetUriOrCommentIdOrAuthor: string,
) {
  return ["CommentItems", viewer, chainId, targetUriOrCommentIdOrAuthor];
}

export function createReplyItemsQueryKey(
  viewer: Hex | undefined,
  chainId: number,
  commentId: Hex,
) {
  return ["ReplyItems", viewer, chainId, commentId];
}
