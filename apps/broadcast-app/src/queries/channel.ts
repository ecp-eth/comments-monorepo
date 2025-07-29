import {
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type UndefinedInitialDataInfiniteOptions,
} from "@tanstack/react-query";
import { createChannelQueryKey } from "./query-keys";
import { sdk } from "@farcaster/miniapp-sdk";
import { publicEnv } from "@/env/public";
import { ChannelNotFoundError } from "@/errors";
import { Channel, ChannelSchema } from "@/api/schemas";
import { useCallback } from "react";
import { createChannelCommentsQueryKey } from "./query-keys";
import {
  fetchComments,
  IndexerAPIListCommentsSchemaType,
} from "@ecp.eth/sdk/indexer";
import type { Hex } from "@ecp.eth/sdk/core/schemas";

export function useChannelQuery(channelId: bigint) {
  return useQuery({
    queryKey: createChannelQueryKey(channelId),
    queryFn: async ({ signal }) => {
      const channelUrl = new URL(
        `/api/channels/${channelId}`,
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const channelResponse = await sdk.quickAuth.fetch(channelUrl, {
        signal,
      });

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

type UseChannelCommentsQueryParams = {
  channelId: bigint;
  author: Hex | undefined;
  chainId: number;
} & Omit<
  UndefinedInitialDataInfiniteOptions<
    IndexerAPIListCommentsSchemaType,
    Error,
    InfiniteData<IndexerAPIListCommentsSchemaType>,
    QueryKey,
    { cursor: Hex; direction: "forward" | "backward" } | undefined
  >,
  | "queryKey"
  | "queryFn"
  | "initialPageParam"
  | "getNextPageParam"
  | "getPreviousPageParam"
>;

export function useChannelCommentsQuery({
  channelId,
  author,
  chainId,
  ...options
}: UseChannelCommentsQueryParams) {
  return useInfiniteQuery({
    ...options,
    queryKey: createChannelCommentsQueryKey({ channelId, author }),
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchComments({
        chainId,
        channelId,
        apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
        mode: "flat",
        viewer: author,
        moderationStatus: ["approved", "pending"],
        signal,
        cursor: pageParam?.cursor,
        sort: pageParam?.direction === "forward" ? "desc" : "desc",
      });

      return {
        // use reversed order because we want to show the newest comments at the bottom
        results: response.results.toReversed(),
        pagination: response.pagination,
        extra: response.extra,
      };
    },
    getNextPageParam(lastPage) {
      if (lastPage.pagination.hasNext && lastPage.pagination.endCursor) {
        return {
          cursor: lastPage.pagination.endCursor,
          direction: "forward" as const,
        };
      }

      return undefined;
    },
    getPreviousPageParam(firstPage) {
      if (
        firstPage.pagination.hasPrevious &&
        firstPage.pagination.startCursor
      ) {
        return {
          cursor: firstPage.pagination.startCursor,
          direction: "backward" as const,
        };
      }

      return undefined;
    },
    initialPageParam: undefined as
      | { cursor: Hex; direction: "forward" | "backward" }
      | undefined,
  });
}
