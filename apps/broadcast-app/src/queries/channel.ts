import {
  type InfiniteData,
  type QueryKey,
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
  type IndexerAPIListCommentsSchemaType,
} from "@ecp.eth/sdk/indexer";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { MAX_INITIAL_REPLIES_ON_PARENT_COMMENT } from "@/constants";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";

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

type ChannelCommentsQueryPageParam = {
  cursor: Hex | undefined;
  limit: number;
};

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
    ChannelCommentsQueryPageParam | undefined
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
    queryKey: createChannelCommentsQueryKey({ channelId, viewer: author }),
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchComments({
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        chainId,
        channelId,
        apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
        commentType: COMMENT_TYPE_COMMENT,
        mode: "flat",
        viewer: author,
        moderationStatus: ["approved", "pending"],
        signal,
        cursor: pageParam?.cursor,
        limit: MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
        // @todo determine sort because for previous page we need to reverse the sort
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
          limit: lastPage.pagination.limit,
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
          limit: firstPage.pagination.limit,
        };
      }

      return undefined;
    },
    initialPageParam: {
      cursor: undefined,
      limit: MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
    } as ChannelCommentsQueryPageParam,
  });
}
