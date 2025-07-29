import { publicEnv } from "@/env/public";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "@farcaster/miniapp-sdk";
import { Channel, ListChannelsResponseSchema } from "@/api/schemas";
import { useCallback } from "react";
import z from "zod";
import {
  createDiscoverChannelsQueryKey,
  createMyChannelsQueryKey,
} from "./query-keys";

export function useMyChannelsQuery() {
  return useQuery({
    queryKey: createMyChannelsQueryKey(),
    queryFn: async () => {
      const url = new URL(
        "/api/channels",
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );

      url.searchParams.set("onlySubscribed", "1");

      const response = await sdk.quickAuth.fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.statusText}`);
      }

      return ListChannelsResponseSchema.parse(await response.json());
    },
  });
}

type MyChannelsQueryData = z.infer<typeof ListChannelsResponseSchema>;

export function useRemoveChannelFromMyChannelsQuery() {
  const queryClient = useQueryClient();

  return useCallback(
    (channelId: bigint) => {
      const queryKey = createMyChannelsQueryKey();

      queryClient.setQueryData(
        queryKey,
        (
          old: MyChannelsQueryData | undefined,
        ): MyChannelsQueryData | undefined => {
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
        queryKey: createDiscoverChannelsQueryKey(),
      });
    },
    [queryClient],
  );
}

export function useUpdateChannelInMyChannelsQuery() {
  const queryClient = useQueryClient();

  return useCallback(
    (channelId: bigint, channel: Partial<Channel>) => {
      queryClient.setQueryData(
        createMyChannelsQueryKey(),
        (old: MyChannelsQueryData | undefined) => {
          if (!old) {
            return undefined;
          }

          return {
            ...old,
            results: old.results.map((c) =>
              c.id === channelId ? { ...c, ...channel } : c,
            ),
          };
        },
      );
    },
    [queryClient],
  );
}
