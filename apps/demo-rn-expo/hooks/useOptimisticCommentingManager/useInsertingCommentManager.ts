import { useCallback, useState } from "react";
import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { Hex, isZeroHex } from "@ecp.eth/sdk/core";
import {
  IndexerAPIListCommentsSchemaType,
  IndexerAPICommentWithRepliesSchemaType,
  IndexerAPIListCommentRepliesSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import {
  FetchCommentInfinityQuerySchema,
  PendingCommentOperationSchemaType,
  PendingOperationSchema,
  PendingOperationSchemaType,
} from "./schemas";
import { useMonitorListCommentsCache } from "./useMonitorListCommentsCache";
import {
  everyIndexerAPIListComments,
  isIndexerAPICommentWithRepliesSchema,
} from "./helpers";

export function useInsertingCommentManager(
  client: QueryClient,
  queryKey: QueryKey,
) {
  const [pendingCommentOperations, setPendingCommentOperations] = useState<
    PendingCommentOperationSchemaType[]
  >([]);

  useMonitorListCommentsCache(client, queryKey, {
    enabled: pendingCommentOperations.length > 0,
    onUpdate: (cachedIndexerAPIListComments) => {
      // find out uninserted pending comment and insert them to the cache
      const uninserted = filterUninsertedPendingCommentOperations(
        pendingCommentOperations,
        cachedIndexerAPIListComments,
      );

      insertPendingCommentOperationToCache(client, queryKey, uninserted);

      // find out unindexed pending comment and keep them in the state for future
      // cache updates
      setPendingCommentOperations((pendingCommentOperations) => {
        const unindexedPendingCommentOperations =
          filterUnindexedPendingCommentOperations(
            pendingCommentOperations,
            cachedIndexerAPIListComments,
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
    [client, queryKey],
  );

  return {
    insertPendingCommentOperation,
  };
}

/**
 * Return a filtered list of inserting `pendingCommentOperations` that are not found in the cache
 * @param pendingCommentOperations
 * @param cachedIndexerAPIListComments
 * @returns
 */
function filterUninsertedPendingCommentOperations(
  pendingCommentOperations: PendingCommentOperationSchemaType[],
  cachedIndexerAPIListComments: IndexerAPIListCommentsSchemaType,
) {
  return pendingCommentOperations.filter((pendingCommentOperation) => {
    const notFoundInCache = everyIndexerAPIListComments(
      cachedIndexerAPIListComments,
      (commentInCache) => {
        if (commentInCache.id === pendingCommentOperation.response.hash) {
          // found a match, break the loop
          return false;
        }
      },
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
  cachedIndexerAPIListComments: IndexerAPIListCommentsSchemaType,
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
      },
    );

    return foundButUnindexed || notFoundInCache;
  });
}

/**
 * Insert pending comment operation into react query cache
 * @param client
 * @param queryKey
 * @param pendingCommentOperations
 */
function insertPendingCommentOperationToCache(
  client: QueryClient,
  queryKey: QueryKey,
  pendingCommentOperations: PendingCommentOperationSchemaType[],
) {
  if (pendingCommentOperations.length <= 0) {
    return;
  }

  client.setQueryData(queryKey, (existingCache: unknown) => {
    if (!existingCache) {
      return;
    }

    const parsed = FetchCommentInfinityQuerySchema.safeParse(existingCache);

    if (!parsed.success) {
      console.error(
        "Failed to parse existing cache data, this is likely a bug. detailed error follows:",
        parsed.error,
      );
      console.error(existingCache);
      return;
    }

    const cachedArrayOfIndexerAPIListComments = parsed.data.pages;

    pendingCommentOperations.forEach((pendingCommentOperation) => {
      const parentId = pendingCommentOperation.response.data.parentId;
      const parentStructure = isZeroHex(parentId)
        ? cachedArrayOfIndexerAPIListComments[0]
        : getParentStructureForInserting(
            cachedArrayOfIndexerAPIListComments,
            pendingCommentOperation.response.data.parentId,
          );

      parentStructure.results.unshift(
        createIndexerAPICommentDataFromPendingCommentOperation(
          pendingCommentOperation,
          "insert",
        ),
      );

      popOutOfLimitItemsFromList(parentStructure);
    });

    return parsed.data;
  });
}

function getParentStructureForInserting(
  arrayOfIndexerAPICommentReplies: IndexerAPIListCommentRepliesSchemaType[],
  parentId: Hex,
): IndexerAPIListCommentRepliesSchemaType {
  let parentStructure: IndexerAPIListCommentRepliesSchemaType | undefined;

  arrayOfIndexerAPICommentReplies.forEach((indexerAPICommentReplies) => {
    everyIndexerAPIListComments(
      indexerAPICommentReplies,
      (indexerAPIComment) => {
        if (indexerAPIComment.id === parentId) {
          // narrow type, don't safeParse as it create a new object.
          if (!isIndexerAPICommentWithRepliesSchema(indexerAPIComment)) {
            // this is either in non-flat mode we hit the depth limit, or it is flat mode with doesn't have replies prop
            // if it is latter we simply want to insert the pending comment to the top of cached pages
            return false;
          }

          parentStructure = indexerAPIComment.replies;
          return false;
        }
      },
    );
  });

  return parentStructure ?? arrayOfIndexerAPICommentReplies[0];
}

/**
 * Create a indexer API comment data (with id, chain, author...) from a pending comment operation
 * @param pendingCommentOperation
 * @returns
 */
function createIndexerAPICommentDataFromPendingCommentOperation(
  pendingCommentOperation: PendingCommentOperationSchemaType,
  pendingType: PendingOperationSchemaType["pendingType"],
): IndexerAPICommentWithRepliesSchemaType & PendingOperationSchemaType {
  // insert pending comment to the top of the list
  return {
    ...pendingCommentOperation.response.data,
    id: pendingCommentOperation.response.hash,
    chainId: pendingCommentOperation.chainId,
    createdAt: new Date(),
    updatedAt: new Date(),
    revision: 0,
    txHash: pendingCommentOperation.txHash,
    logIndex: 0,
    author: {
      // no need to mock ens or farcaster data as
      // they will be fetched from <CommentAuthorAvatar /> if not provided
      address: pendingCommentOperation.response.data.author,
    },
    deletedAt: null,
    zeroExSwap: null,
    cursor: pendingCommentOperation.response.hash,
    hookMetadata: [],
    replies: {
      results: [],
      pagination: {
        limit: 0,
        hasNext: false,
        hasPrevious: false,
      },
      extra: { moderationEnabled: false, moderationKnownReactions: [] },
    },
    pendingType,
    moderationStatus: "approved",
    moderationStatusChangedAt: new Date(),
  };
}

/**
 * remove items at the end, keep total number of items within the limit
 * @param cachedIndexAPIListComments
 */
function popOutOfLimitItemsFromList(
  cachedIndexAPIListComments: IndexerAPIListCommentRepliesSchemaType,
) {
  const itemsToPop =
    cachedIndexAPIListComments.results.length -
    cachedIndexAPIListComments.pagination.limit;

  for (let i = 0; i < itemsToPop; i++) {
    cachedIndexAPIListComments.results.pop();
  }
}
