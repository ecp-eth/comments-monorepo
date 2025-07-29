export function createDiscoverChannelsQueryKey() {
  return ["discover-channels"] as const;
}

export function createMyChannelsQueryKey() {
  return ["my-channels"] as const;
}

export function createChannelQueryKey(channelId: bigint) {
  return ["channel", channelId.toString()] as const;
}
