import type {
  CommentPageSchemaType,
  ListCommentsQueryDataSchemaType,
} from "../schemas.js";
import {
  type InfiniteData,
  type QueryKey,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { hasNewComments, mergeNewComments } from "../helpers.js";
import type {
  Hex,
  IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchemaType,
} from "@ecp.eth/sdk/schemas";

/**
 * This hook checks whether there are any new comments on the query given by the `queryKey`.
 * If there are new comments, it updates the first page pagination info so UI can react to them.
 */
export function useNewCommentsChecker({
  enabled = true,
  queryKey,
  queryData,
  fetchComments: fetchFn,
  refetchInterval = 60000,
}: {
  /**
   * Whether to enable the new comments checker.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * Query to update the first page pagination.
   */
  queryKey: QueryKey;
  queryData: InfiniteData<CommentPageSchemaType> | undefined;
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
      }
    );
  }, [client, newCommentsQueryKey]);

  useEffect(() => {
    if (!queryResult.data || !queryData) {
      return;
    }

    const newComments = queryResult.data;

    // this also has new comments (not written by us, so let user decide if they want to see them, see fetchNewComments())
    if (hasNewComments(queryData, queryResult.data)) {
      return;
    }

    // remove pending operations and make sure the order of new comments is correct
    // based on indexer result
    client.setQueryData<ListCommentsQueryDataSchemaType>(
      queryKey,
      (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return mergeNewComments(oldData, newComments);
      }
    );

    resetQuery();
  }, [queryResult.data, queryData, resetQuery, client, queryKey]);

  const fetchNewComments = useCallback(() => {
    if (!queryData || !queryResult.data) {
      return;
    }

    const newComments = queryResult.data;

    client.setQueryData<ListCommentsQueryDataSchemaType>(
      queryKey,
      (oldData) => {
        if (!oldData) {
          return;
        }

        return mergeNewComments(oldData, newComments);
      }
    );

    resetQuery();
  }, [queryData, queryResult.data, client, queryKey, resetQuery]);

  return useMemo(() => {
    return {
      hasNewComments:
        queryData && queryResult.data
          ? hasNewComments(queryData, queryResult.data)
          : false,
      fetchNewComments,
    };
  }, [queryData, queryResult.data, fetchNewComments]);
}
