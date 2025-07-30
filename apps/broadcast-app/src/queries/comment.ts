import type { Hex } from "@ecp.eth/sdk/core";
import {
  type InfiniteData,
  type QueryKey,
  type UndefinedInitialDataInfiniteOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { createCommentRepliesQueryKey } from "./query-keys";
import { fetchCommentReplies } from "@ecp.eth/sdk/indexer";
import { MAX_INITIAL_REPLIES_ON_PARENT_COMMENT } from "@/constants";
import { publicEnv } from "@/env/public";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import type { CommentPageSchemaType } from "@ecp.eth/shared/schemas";

export type CommentRepliesQueryPageParam = {
  cursor: Hex | undefined;
  limit: number;
};

type UseCommentRepliesQueryParams = {
  viewer: Hex | undefined;
  commentId: Hex;
  chainId: number;
  channelId: bigint;
} & Omit<
  UndefinedInitialDataInfiniteOptions<
    CommentPageSchemaType,
    Error,
    InfiniteData<CommentPageSchemaType>,
    QueryKey,
    CommentRepliesQueryPageParam | undefined
  >,
  | "queryKey"
  | "queryFn"
  | "initialPageParam"
  | "getNextPageParam"
  | "getPreviousPageParam"
>;

export function useCommentRepliesQuery({
  chainId,
  channelId,
  commentId,
  viewer,
  ...options
}: UseCommentRepliesQueryParams) {
  return useInfiniteQuery({
    ...options,
    queryKey: createCommentRepliesQueryKey({ commentId, viewer }),
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchCommentReplies({
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        commentId,
        chainId,
        channelId,
        apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
        mode: "flat",
        viewer,
        moderationStatus: ["approved", "pending"],
        signal,
        cursor: pageParam?.cursor,
        limit: MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
        commentType: COMMENT_TYPE_COMMENT,
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
    },
    initialPageParam: {
      cursor: undefined,
      limit: MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
    } as CommentRepliesQueryPageParam,
  });
}
