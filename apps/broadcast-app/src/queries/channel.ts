import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type UndefinedInitialDataInfiniteOptions,
} from "@tanstack/react-query";
import {
  createChannelQueryKey,
  createCommentRepliesQueryKey,
} from "./query-keys";
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
import { MAX_COMMENTS_PER_PAGE } from "@/constants";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";

export function useChannelQuery(channelId: bigint) {
  return useQuery({
    queryKey: createChannelQueryKey(channelId),
    queryFn: async ({ signal }) => {
      const channelResponse = await fetch(
        `/api/indexer/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/channels/${channelId}`,
        {
          signal,
        },
      );

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
        limit: MAX_COMMENTS_PER_PAGE,
        // @todo determine sort because for previous page we need to reverse the sort
      });

      return response;
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
      limit: MAX_COMMENTS_PER_PAGE,
    } as ChannelCommentsQueryPageParam,
  });
}

export function useMarkChannelCommentsAsHavingNewReplies() {
  const queryClient = useQueryClient();

  return useCallback(
    (commentId: Hex, viewer: Hex | undefined) => {
      queryClient.setQueryData(
        createCommentRepliesQueryKey({ commentId, viewer }),
        (
          old: InfiniteData<IndexerAPIListCommentsSchemaType> | undefined,
        ): InfiniteData<IndexerAPIListCommentsSchemaType> | undefined => {
          if (!old) {
            return undefined;
          }

          if (old.pages.length === 0) {
            return old;
          }

          old.pages[0].pagination.hasPrevious = true;

          return old;
        },
      );
    },
    [queryClient],
  );
}
