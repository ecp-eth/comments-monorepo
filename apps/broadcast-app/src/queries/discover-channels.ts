import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  return useInfiniteQuery({
    queryKey: createDiscoverChannelsQueryKey(),
    queryFn: async ({ pageParam: cursor }) => {
      const url = new URL(
        "/api/channels",
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await sdk.quickAuth.fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.statusText}`);
      }

      return ListChannelsResponseSchema.parse(await response.json());
    },
    getNextPageParam(lastPage): string | undefined {
      if (lastPage.pageInfo.hasNextPage && lastPage.pageInfo.nextCursor) {
        return lastPage.pageInfo.nextCursor;
      }

      return undefined;
    },
    initialPageParam: undefined as string | undefined,
  });
}

const discoverChannelsQuerySchema = z.object({
  pages: z.array(ListChannelsResponseSchema),
  pageParams: z.array(z.string().optional()),
});

type DiscoverChannelsQueryData = z.infer<typeof discoverChannelsQuerySchema>;

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

          const queryData = discoverChannelsQuerySchema.parse(old);

          return {
            pages: queryData.pages.map((page) => {
              const filteredResults = page.results.filter(
                (channel) => channel.id !== channelId,
              );

              return {
                ...page,
                results: filteredResults,
              };
            }),
            pageParams: queryData.pageParams,
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
