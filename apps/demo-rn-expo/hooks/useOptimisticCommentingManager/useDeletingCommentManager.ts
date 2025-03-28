import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Hex, IndexerAPIListCommentsSchemaType } from "@ecp.eth/sdk/schemas";
import { useMonitorListCommentsCache } from "./useMonitorListCommentsCache";
import { everyIndexerAPIListComments } from "./helpers";
import {
  FetchCommentInfinityQuerySchema,
  IndexerAPICommentWithPendingOperationSchemaType,
  PendingOperationSchema,
} from "./schemas";

const DELETED_COMMENT_CONTENT = "[deleted]";

export function useDeletingCommentManager(
  client: QueryClient,
  queryKey: QueryKey
) {
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
        if (
          commentInCache.id !== deletingId ||
          commentInCache.deletedAt == null
        ) {
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

/**
 * Mark the pending comment operation from cache as deleted
 * @param client
 * @param queryKey
 * @param pendingCommentOperations
 */
function deletePendingCommentOperationFromCache(
  client: QueryClient,
  queryKey: QueryKey,
  deletingIds: Hex[]
) {
  if (deletingIds.length <= 0) {
    return;
  }

  client.setQueryData(queryKey, (oldData: unknown) => {
    if (!oldData) {
      return;
    }

    const parsed = FetchCommentInfinityQuerySchema.safeParse(oldData);
    if (!parsed.success) {
      console.error(
        "Failed to parse old data, this is likely a bug:",
        parsed.error
      );
      return;
    }

    const cachedArrayOfIndexerAPIListComments = parsed.data.pages;

    deletingIds.forEach((deletingId) => {
      cachedArrayOfIndexerAPIListComments.forEach(
        (cachedArrayOfIndexerAPIListComment) => {
          everyIndexerAPIListComments(
            cachedArrayOfIndexerAPIListComment,
            (indexerAPIComment) => {
              if (indexerAPIComment.id === deletingId) {
                indexerAPIComment.content = DELETED_COMMENT_CONTENT;
                (indexerAPIComment.deletedAt as unknown as number) = Date.now();
                (
                  indexerAPIComment as IndexerAPICommentWithPendingOperationSchemaType
                ).pendingType = "delete";
                return false;
              }

              return true;
            }
          );
        }
      );
    });

    return parsed.data;
  });
}
