import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createChannelQueryKey } from "./query-keys";
import { sdk } from "@farcaster/miniapp-sdk";
import { publicEnv } from "@/env/public";
import { ChannelNotFoundError } from "@/errors";
import { Channel, ChannelSchema } from "@/api/schemas";
import { useCallback } from "react";

export function useChannelQuery(channelId: bigint) {
  return useQuery({
    queryKey: createChannelQueryKey(channelId),
    queryFn: async () => {
      const channelUrl = new URL(
        `/api/channels/${channelId}`,
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const channelResponse = await sdk.quickAuth.fetch(channelUrl);

      if (channelResponse.status === 404) {
        throw new ChannelNotFoundError();
      }

      if (!channelResponse.ok) {
        throw new Error(
          `Failed to fetch channel: ${channelResponse.statusText}`,
        );
      }

      return ChannelSchema.parse(await channelResponse.json());
    },
  });
}

export function useUpdateChannelInChannelQuery() {
  const queryClient = useQueryClient();

  return useCallback(
    (channelId: bigint, channel: Partial<Channel>) => {
      queryClient.setQueryData(
        createChannelQueryKey(channelId),
        (old: Channel | undefined): Channel | undefined => {
          if (!old) {
            return undefined;
          }

          return { ...old, ...channel };
        },
      );
    },
    [queryClient],
  );
}
