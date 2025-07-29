import type { Hex } from "@ecp.eth/sdk/core/schemas";

type CreateChannelCommentsQueryKeyParams = {
  channelId: bigint;
  author: Hex | undefined;
};

export function createChannelCommentsQueryKey({
  channelId,
  author,
}: CreateChannelCommentsQueryKeyParams) {
  return [author, "channel", channelId.toString(), "comments"] as const;
}

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
