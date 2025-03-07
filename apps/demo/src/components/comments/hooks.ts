import {
  QueryCacheNotifyEvent,
  QueryClient,
  type QueryKey,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Hex, IndexerAPIListCommentsSchemaType } from "@ecp.eth/sdk/schemas";
import {
  PendingCommentOperationSchemaType,
  PendingOperationSchema,
  IndexerAPIListCommentsWithPendingOperationsSchema,
  IndexerAPIListCommentsWithPendingOperationsSchemaType,
} from "@/lib/schemas";
import {
  deletePendingCommentOperationFromCache,
  everyIndexerAPIListComments,
  insertPendingCommentOperationToCache,
} from "./helpers";

/**
 * We want to have a responsive UI by immediately showing the comment after it's posted successfully.
 *
 * The Problem:
 * The fetchComments() function used for refreshing comments, goes through the indexer first,
 * and it takes a little bit of time for indexer to receive the event and process it.
 *
 * So if we refresh immediately after the post, depends on the network speed,
 * there is a chance that the comment posted is not indexed yet, in this case the user will not see
 * the comment posted immediately, and the fetchComments() will also overwrite existing pending comment
 * in the react query cache.
 *
 * So this hook does below to make sure the comment posted is visible to the user:
 * 1. insert pending comment operations into react query cache immediately after post.
 * 2. when the react query cache is updated, make sure the pending comment operation
 *     is inserted again if the comment id is not in the cache.
 *
 * @param queryKey
 * @returns `insertPendingCommentOperation` for inserting pending comment operations
 */
export function useOptimisticCommentingManager(queryKey: QueryKey) {
  const client = useQueryClient();
  const { insertPendingCommentOperation } = useInsertingCommentManager(
    client,
    queryKey
  );
  const { deletePendingCommentOperation } = useDeletingCommentManager(
    client,
    queryKey
  );

  return {
    insertPendingCommentOperation,
    deletePendingCommentOperation,
  };
}

function useInsertingCommentManager(client: QueryClient, queryKey: QueryKey) {
  const [pendingCommentOperations, setPendingCommentOperations] = useState<
    PendingCommentOperationSchemaType[]
  >([]);

  useMonitorListCommentsCache(client, queryKey, {
    enabled: pendingCommentOperations.length > 0,
    onUpdate: (cachedIndexerAPIListComments) => {
      // find out uninserted pending comment and insert them to the cache
      const uninserted = filterUninsertedPendingCommentOperations(
        pendingCommentOperations,
        cachedIndexerAPIListComments
      );

      insertPendingCommentOperationToCache(client, queryKey, uninserted);

      // find out unindexed pending comment and keep them in the state for future
      // cache updates
      setPendingCommentOperations((pendingCommentOperations) => {
        const unindexedPendingCommentOperations =
          filterUnindexedPendingCommentOperations(
            pendingCommentOperations,
            cachedIndexerAPIListComments
          );

        return unindexedPendingCommentOperations;
      });
    },
  });

  const insertPendingCommentOperation = useCallback(
    (pendingCommentOperation: PendingCommentOperationSchemaType) => {
      insertPendingCommentOperationToCache(client, queryKey, [
        pendingCommentOperation,
      ]);
      setPendingCommentOperations((prev) => [...prev, pendingCommentOperation]);
    },
    [client, queryKey]
  );

  return {
    insertPendingCommentOperation,
  };
}

function useDeletingCommentManager(client: QueryClient, queryKey: QueryKey) {
  const [deletingCommentIds, setDeletingCommentIds] = useState<Hex[]>([]);

  useMonitorListCommentsCache(client, queryKey, {
    enabled: deletingCommentIds.length > 0,
    onUpdate: (cachedIndexerAPIListComments) => {
      const undeleted = filterUnmarkedDeletedPendingCommentOperations(
        deletingCommentIds,
        cachedIndexerAPIListComments
      );
      deletePendingCommentOperationFromCache(client, queryKey, undeleted);

      setDeletingCommentIds((prev) => {
        const unindexed = filterUnindexedDeletedPendingCommentOperations(
          prev,
          cachedIndexerAPIListComments
        );

        return unindexed;
      });
    },
  });

  const deletePendingCommentOperation = useCallback(
    (deletingId: Hex) => {
      deletePendingCommentOperationFromCache(client, queryKey, [deletingId]);
      setDeletingCommentIds((prev) => [...prev, deletingId]);
    },
    [client, queryKey]
  );

  return {
    deletePendingCommentOperation,
  };
}

function useMonitorListCommentsCache(
  client: QueryClient,
  queryKey: QueryKey,
  {
    enabled,
    onUpdate,
  }: {
    enabled: boolean;
    onUpdate: (
      data: IndexerAPIListCommentsWithPendingOperationsSchemaType
    ) => void;
  }
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const queryCache = client.getQueryCache();
    const handleSubscribe = (event: QueryCacheNotifyEvent) => {
      if (event.type !== "updated") {
        return;
      }

      const query = event.query;

      if (queryKey.join("/") !== query.queryKey.join("/")) {
        return;
      }

      const parsed =
        IndexerAPIListCommentsWithPendingOperationsSchema.safeParse(
          query.state.data
        );
      if (!parsed.success) {
        return;
      }

      onUpdate(parsed.data);
    };

    return queryCache.subscribe(handleSubscribe);
  }, [client, enabled, onUpdate, queryKey]);
}

/**
 * Return a filtered list of inserting `pendingCommentOperations` that are not found in the cache
 * @param pendingCommentOperations
 * @param cachedIndexerAPIListComments
 * @returns
 */
function filterUninsertedPendingCommentOperations(
  pendingCommentOperations: PendingCommentOperationSchemaType[],
  cachedIndexerAPIListComments: IndexerAPIListCommentsSchemaType
) {
  return pendingCommentOperations.filter((pendingCommentOperation) => {
    const notFoundInCache = everyIndexerAPIListComments(
      cachedIndexerAPIListComments,
      (commentInCache) => {
        if (commentInCache.id === pendingCommentOperation.response.hash) {
          // found a match, break the loop
          return false;
        }
      }
    );

    return notFoundInCache;
  });
}

/**
 * Return a filtered list of inserting `pendingCommentOperations` that are not found in the indexer
 * (include the ones that are optimistically installed)
 * @param pendingCommentOperations
 * @param cachedIndexerAPIListComments
 * @returns
 */
function filterUnindexedPendingCommentOperations(
  pendingCommentOperations: PendingCommentOperationSchemaType[],
  cachedIndexerAPIListComments: IndexerAPIListCommentsSchemaType
) {
  return pendingCommentOperations.filter((pendingCommentOperation) => {
    let foundButUnindexed = false;
    const notFoundInCache = everyIndexerAPIListComments(
      cachedIndexerAPIListComments,
      (commentInCache) => {
        if (commentInCache.id !== pendingCommentOperation.response.hash) {
          return true;
        }

        const parsed = PendingOperationSchema.safeParse(commentInCache);
        if (parsed.success && parsed.data.pendingType === "insert") {
          // this is pending comment inserted optimistically
          foundButUnindexed = true;
        }

        // break the loop
        return false;
      }
    );

    return foundButUnindexed || notFoundInCache;
  });
}

/**
 * Return a filtered list of deleting `pendingCommentOperations` that are not found in the cache
 * @param pendingCommentOperations
 * @param cachedIndexerAPIListComments
 * @returns
 */
function filterUnmarkedDeletedPendingCommentOperations(
  deletingIds: Hex[],
  cachedIndexerAPIListComments: IndexerAPIListCommentsSchemaType
) {
  return deletingIds.filter((deletingId) => {
    const notFoundInCache = everyIndexerAPIListComments(
      cachedIndexerAPIListComments,
      (commentInCache) => {
        if (
          commentInCache.id === deletingId &&
          commentInCache.deletedAt != null
        ) {
          // found a match, break the loop
          return false;
        }
      }
    );

    return notFoundInCache;
  });
}

/**
 * Return a filtered list of deleting `pendingCommentOperations` that are not found in the indexer
 * @param pendingCommentOperations
 * @param cachedIndexerAPIListComments
 * @returns
 */
function filterUnindexedDeletedPendingCommentOperations(
  deletingIds: Hex[],
  cachedIndexerAPIListComments: IndexerAPIListCommentsSchemaType
) {
  return deletingIds.filter((deletingId) => {
    let foundButUnindexed = false;

    const notFoundInCache = everyIndexerAPIListComments(
      cachedIndexerAPIListComments,
      (commentInCache) => {
        if (commentInCache.id !== deletingId || commentInCache.deletedAt == null) {
          return true;
        }

        const parsed = PendingOperationSchema.safeParse(commentInCache);
        if (parsed.success && parsed.data.pendingType === "delete") {
          // this is pending comment inserted optimistically
          foundButUnindexed = true;
        }
      }
    );

    return notFoundInCache || foundButUnindexed;
  });
}