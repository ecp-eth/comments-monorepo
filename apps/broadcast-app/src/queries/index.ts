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

export function createChannelQueryKey(channelId: bigint) {
  return ["channel", channelId.toString()] as const;
}

export function createDiscoverChannelsQueryKey() {
  return ["discover-channels"] as const;
}

export function createMyChannelsQueryKey() {
  return ["my-channels"] as const;
}
