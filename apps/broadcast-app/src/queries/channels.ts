import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { publicEnv } from "@/env/public";
import { type Channel, ListChannelsResponseSchema } from "@/api/schemas";
import { useCallback } from "react";
import { z } from "zod";
import { createChannelsQueryKey } from "./query-keys";
import { UnauthorizedError } from "@/errors";
import { useAuth } from "@/components/auth-provider";
import { secureFetch } from "@/lib/secure-fetch";

export function useChannelsQuery() {
  const auth = useAuth();

  return useInfiniteQuery({
    queryKey: createChannelsQueryKey(),
    refetchOnMount: true,
    queryFn: async ({ pageParam: cursor, signal }) => {
      const searchParams = new URLSearchParams();

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
    getNextPageParam(lastPage): string | undefined {
      if (lastPage.pageInfo.hasNextPage && lastPage.pageInfo.nextCursor) {
        return lastPage.pageInfo.nextCursor;
      }

      return undefined;
    },
    initialPageParam: undefined as string | undefined,
  });
}

const channelsQuerySchema = z.object({
  pages: z.array(ListChannelsResponseSchema),
  pageParams: z.array(z.string().optional()),
});

type ChannelsQueryData = z.infer<typeof channelsQuerySchema>;

export function useUpdateChannelInChannelsQuery() {
  const queryClient = useQueryClient();

  return useCallback(
    (channelId: bigint, channelUpdate: Partial<Channel>) => {
      const queryKey = createChannelsQueryKey();

      queryClient.setQueryData(
        queryKey,
        (old: ChannelsQueryData | undefined): ChannelsQueryData | undefined => {
          if (!old) {
            return undefined;
          }

          const queryData = channelsQuerySchema.parse(old);

          return {
            pages: queryData.pages.map((page) => {
              const filteredResults = page.results.map((channel) => {
                if (channel.id === channelId) {
                  return {
                    ...channel,
                    ...channelUpdate,
                  };
                }

                return channel;
              });

              return {
                ...page,
                results: filteredResults,
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
