import { useQuery, useQueryClient } from "@tanstack/react-query";
import { publicEnv } from "@/env/public";
import sdk from "@farcaster/miniapp-sdk";
import { ListChannelsResponseSchema } from "@/api/schemas";
import { useCallback } from "react";
import { z } from "zod";
import {
  createDiscoverChannelsQueryKey,
  createMyChannelsQueryKey,
} from "./query-keys";

export function useDiscoverChannelsQuery() {
  return useQuery({
    queryKey: createDiscoverChannelsQueryKey(),
    queryFn: async () => {
      const url = new URL(
        "/api/channels",
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const response = await sdk.quickAuth.fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.statusText}`);
      }

      return ListChannelsResponseSchema.parse(await response.json());
    },
  });
}

type DiscoverChannelsQueryData = z.infer<typeof ListChannelsResponseSchema>;

export function useRemoveChannelFromDiscoverQuery() {
  const queryClient = useQueryClient();

  return useCallback(
    (channelId: bigint) => {
      const queryKey = createDiscoverChannelsQueryKey();

      queryClient.setQueryData(
        queryKey,
        (
          old: DiscoverChannelsQueryData | undefined,
        ): DiscoverChannelsQueryData | undefined => {
          if (!old) {
            return undefined;
          }

          const filteredResults = old.results.filter(
            (channel) => channel.id !== channelId,
          );

          return {
            ...old,
            results: filteredResults,
          };
        },
      );

      queryClient.refetchQueries({
        exact: true,
        queryKey: createMyChannelsQueryKey(),
      });
    },
    [queryClient],
  );
}
