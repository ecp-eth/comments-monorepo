import type { Hex } from "@ecp.eth/sdk/core/schemas";

type CreateChannelCommentRepliesQueryKeyParams = {
  channelId: bigint;
  author: Hex;
  parentId: Hex;
};

export function createChannelCommentRepliesQueryKey({
  channelId,
  author,
  parentId,
}: CreateChannelCommentRepliesQueryKeyParams) {
  return [
    author,
    "channel",
    channelId.toString(),
    "comments",
    parentId,
    "replies",
  ] as const;
}
