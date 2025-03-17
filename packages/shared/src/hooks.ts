import {
  CommentPageSchemaType,
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
} from "./schemas.js";
import {
  InfiniteData,
  type QueryKey,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import type {
  OnDeleteComment,
  OnRetryPostComment,
  OnSubmitSuccessFunction,
} from "./types.js";
import {
  hasNewComments,
  mergeNewComments,
  insertPendingCommentToPage,
  markCommentAsDeleted,
  replaceCommentPendingOperationByComment,
} from "./helpers.js";
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
  queryKey,
  queryData,
  fetchComments: fetchFn,
  refetchInterval = 60000,
}: {
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
    enabled: !!queryData,
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

export function useHandleCommentDeleted({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnDeleteComment {
  const client = useQueryClient();

  return useCallback(
    (commentId) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return markCommentAsDeleted(queryData, commentId);
        }
      );
    },
    [client, queryKey]
  );
}

export function useHandleCommentSubmitted({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnSubmitSuccessFunction {
  const client = useQueryClient();

  return useCallback(
    (pendingOperation) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return insertPendingCommentToPage(queryData, pendingOperation);
        }
      );
    },
    [client, queryKey]
  );
}

export function useHandleRetryPostComment({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnRetryPostComment {
  const client = useQueryClient();

  return useCallback(
    (comment, newPendingOperation) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return replaceCommentPendingOperationByComment(
            queryData,
            comment,
            newPendingOperation
          );
        }
      );
    },
    [client, queryKey]
  );
}
