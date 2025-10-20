import type { CommentPageSchemaType } from "../schemas.js";
import {
  type InfiniteData,
  type QueryKey,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { hasNewComments } from "../helpers.js";
import type {
  IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import type { Hex } from "@ecp.eth/sdk/core/schemas";

/**
 * This hook checks whether there are any new comments on the query given by the `queryKey`.
 * If there are new comments, it updates the first page pagination info so UI can react to them.
 */
export function useNewCommentsChecker({
  enabled = true,
  queryKey,
  queryData,
  refetch,
  fetchComments: fetchFn,
  refetchInterval = 5000,
}: {
  /**
   * Whether to enable the new comments checker.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * Query key used by the main useInfiniteQuery hook.
   */
  queryKey: QueryKey;
  queryData: InfiniteData<CommentPageSchemaType> | undefined;
  /**
   * Function to trigger a refetch of the main useInfiniteQuery hook.
   */
  refetch: () => Promise<unknown>;
  fetchComments: (options: {
    cursor: Hex | undefined;
    signal: AbortSignal;
  }) => Promise<
    IndexerAPIListCommentsSchemaType | IndexerAPIListCommentRepliesSchemaType
  >;
  /**
   * @default 60000
   */
  refetchInterval?: number;
}): {
  hasNewComments: boolean;
  fetchNewComments: () => void;
} {
  const client = useQueryClient();

  const newCommentsQueryKey = useMemo(() => {
    return [...queryKey, "new-comments-checker"];
  }, [queryKey]);

  const resetQuery = useCallback(() => {
    client.setQueryData<IndexerAPIListCommentsSchemaType>(
      newCommentsQueryKey,
      (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return {
          extra: oldData.extra,
          results: [],
          pagination: {
            hasNext: false,
            hasPrevious: false,
            limit: 1,
          },
        };
      },
    );
  }, [client, newCommentsQueryKey]);

  const queryResult = useQuery({
    enabled: !!queryData && enabled,
    queryKey: newCommentsQueryKey,
    queryFn: async ({ signal }) => {
      if (!queryData || !queryData.pages[0]) {
        return;
      }

      const response = await fetchFn({
        cursor: queryData.pages[0].pagination.startCursor,
        signal,
      });

      return response;
    },
    refetchInterval,
  });

  return useMemo(() => {
    return {
      hasNewComments:
        queryData && queryResult.data
          ? hasNewComments(queryData, queryResult.data)
          : false,
      fetchNewComments: async () => {
        resetQuery();
        await refetch();
      },
    };
  }, [queryData, queryResult, refetch, resetQuery]);
}
