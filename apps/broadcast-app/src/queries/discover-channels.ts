import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { publicEnv } from "@/env/public";
import { ListChannelsResponseSchema } from "@/api/schemas";
import { useCallback } from "react";
import { z } from "zod";
import {
  createDiscoverChannelsQueryKey,
  createMyChannelsQueryKey,
} from "./query-keys";
import { UnauthorizedError } from "@/errors";

export function useDiscoverChannelsQuery() {
  return useInfiniteQuery({
    queryKey: createDiscoverChannelsQueryKey(),
    queryFn: async ({ pageParam: cursor, signal }) => {
      const searchParams = new URLSearchParams();

      if (cursor) {
        searchParams.set("cursor", cursor);
      }

      const response = await fetch(
        `/api/indexer/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/channels${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
        { signal },
      );

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

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
