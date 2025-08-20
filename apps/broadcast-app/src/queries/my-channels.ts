import { publicEnv } from "@/env/public";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Channel, ListChannelsResponseSchema } from "@/api/schemas";
import { useCallback } from "react";
import { z } from "zod";
import {
  createDiscoverChannelsQueryKey,
  createMyChannelsQueryKey,
} from "./query-keys";
import { UnauthorizedError } from "@/errors";
import { useAuth } from "@/components/auth-provider";
import { secureFetch } from "@/lib/secure-fetch";

export function useMyChannelsQuery() {
  const auth = useAuth();

  return useInfiniteQuery({
    queryKey: createMyChannelsQueryKey(),
    queryFn: async ({ pageParam: cursor, signal }) => {
      const searchParams = new URLSearchParams();

      searchParams.set("subscriptionFilter", "subscribed");

      if (cursor) {
        searchParams.set("cursor", cursor);
      }

      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(
          `/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/channels${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
          { signal, headers },
        );
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.statusText}`);
      }

      return ListChannelsResponseSchema.parse(await response.json());
    },
    getNextPageParam(lastPage) {
      if (lastPage.pageInfo.hasNextPage && lastPage.pageInfo.nextCursor) {
        return lastPage.pageInfo.nextCursor;
      }

      return undefined;
    },
    initialPageParam: undefined as string | undefined,
  });
}

const myChannelsQuerySchema = z.object({
  pages: z.array(ListChannelsResponseSchema),
  pageParams: z.array(z.string().optional()),
});

type MyChannelsQueryData = z.infer<typeof myChannelsQuerySchema>;

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

          const queryData = myChannelsQuerySchema.parse(old);

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

          const queryData = myChannelsQuerySchema.parse(old);

          return {
            pages: queryData.pages.map((page) => {
              const updatedResults = page.results.map((c) =>
                c.id === channelId ? { ...c, ...channel } : c,
              );

              return {
                ...page,
                results: updatedResults,
              };
            }),
            pageParams: queryData.pageParams,
          };
        },
      );
    },
    [queryClient],
  );
}
