import {
  CommentPageSchemaType,
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
} from "@/lib/schemas";
import {
  InfiniteData,
  type QueryKey,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { OnDeleteComment, OnRetryPostComment } from "./Comment";
import {
  hasNewComments,
  mergeNewComments,
  insertPendingCommentToPage,
  markCommentAsDeleted,
  replaceCommentPendingOperationByComment,
} from "./helpers";
import { OnSubmitSuccessFunction } from "./CommentForm";
import { NEW_COMMENTS_CHECK_INTERVAL } from "@/lib/constants";
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
      if (!queryData) {
        return;
      }

      const response = await fetchFn({
        cursor: queryData.pages[0].pagination.startCursor,
        signal,
      });

      return response;
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

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

    // reset current query
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
  }, [queryData, queryResult.data, client, queryKey, newCommentsQueryKey]);

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
