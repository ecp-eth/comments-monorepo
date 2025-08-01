import type { Hex } from "@ecp.eth/sdk/core/schemas";

export function createDiscoverChannelsQueryKey() {
  return ["discover-channels"] as const;
}

export function createMyChannelsQueryKey() {
  return ["my-channels"] as const;
}

export function createChannelQueryKey(channelId: bigint) {
  return ["channel", channelId.toString()] as const;
}

type CreateChannelCommentsQueryKeyParams = {
  channelId: bigint;
  viewer: Hex | undefined;
};

export function createChannelCommentsQueryKey({
  channelId,
  viewer,
}: CreateChannelCommentsQueryKeyParams) {
  return ["comments", channelId.toString(), viewer] as const;
}

type CreateChannelCommentRepliesQueryKeyParams = {
  viewer: Hex | undefined;
  commentId: Hex;
};

export function createCommentRepliesQueryKey({
  viewer,
  commentId,
}: CreateChannelCommentRepliesQueryKeyParams) {
  return ["replies", commentId, viewer] as const;
}
