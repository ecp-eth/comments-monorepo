import { isZeroHex } from "@ecp.eth/sdk";
import type { CommentType } from "@/lib/types";
import { QueryClient, type QueryKey } from "@tanstack/react-query";
import {
  Hex,
  IndexerAPICommentSchemaType,
  IndexerAPICommentWithRepliesSchema,
  IndexerAPICommentWithRepliesSchemaType,
  IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchema,
} from "@ecp.eth/sdk/schemas";
import {
  IndexerAPICommentWithPendingOperationSchemaType,
  PendingCommentOperationSchemaType,
  PendingOperationSchemaType,
} from "@/lib/schemas";

export const DELETED_COMMENT_CONTENT = "[deleted]";

export function getCommentAuthorNameOrAddress(
  author: CommentType["author"]
): string {
  return author.ens?.name ?? author.farcaster?.displayName ?? author.address;
}

/**
 * Insert pending comment operation into react query cache
 * @param client
 * @param queryKey
 * @param pendingCommentOperations
 */
export function insertPendingCommentOperationToCache(
  client: QueryClient,
  queryKey: QueryKey,
  pendingCommentOperations: PendingCommentOperationSchemaType[]
) {
  if (pendingCommentOperations.length <= 0) {
    return;
  }

  client.setQueryData(queryKey, (oldData: unknown) => {
    if (!oldData) {
      return;
    }

    const parsed = IndexerAPIListCommentsSchema.safeParse(oldData);

    if (!parsed.success) {
      console.warn("Failed to parse old data, this is likely a bug");
      return;
    }

    const cachedListIndexAPIListComments = parsed.data;

    pendingCommentOperations.forEach((pendingCommentOperation) => {
      const parentId = pendingCommentOperation.response.data.parentId;
      const parentStructure = isZeroHex(parentId)
        ? cachedListIndexAPIListComments
        : getParentStructureForInserting(
            cachedListIndexAPIListComments,
            pendingCommentOperation.response.data.parentId
          );

      parentStructure.results.unshift(
        createIndexerAPICommentDataFromPendingCommentOperation(
          pendingCommentOperation,
          "insert"
        )
      );

      popOutOfLimitItemsFromList(parentStructure);
    });

    return cachedListIndexAPIListComments;
  });
}

/**
 * Mark the pending comment operation from cache as deleted
 * @param client
 * @param queryKey
 * @param pendingCommentOperations
 */
export function deletePendingCommentOperationFromCache(
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

    const parsed = IndexerAPIListCommentsSchema.safeParse(oldData);
    if (!parsed.success) {
      console.warn("Failed to parse old data, this is likely a bug");
      return;
    }

    const cachedListIndexAPIListComments = parsed.data;

    deletingIds.forEach((deletingId) => {
      everyIndexerAPIListComments(
        cachedListIndexAPIListComments,
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
    });

    return cachedListIndexAPIListComments;
  });
}

/**
 * tree traverse over comments returned from indexer api, include the ones in replies
 * @param indexerAPIListCommentResult
 * @param callback returns false to break the loop
 * @returns true if the callback returns `true | undefined` for all comments
 */
export function everyIndexerAPIListComments(
  indexerAPIListCommentResult: IndexerAPIListCommentRepliesSchemaType,
  callback: (
    indexerAPIComment: IndexerAPICommentSchemaType,
    parentStructure: IndexerAPIListCommentRepliesSchemaType
  ) => boolean | undefined
) {
  const comments = indexerAPIListCommentResult.results;

  return comments.every((indexerAPIComment): boolean => {
    const abort =
      callback(indexerAPIComment, indexerAPIListCommentResult) === false;

    if (abort) {
      return false;
    }

    if(!isIndexerAPICommentWithRepliesSchema(indexerAPIComment)) {
      return true;
    }

    return everyIndexerAPIListComments(indexerAPIComment.replies, callback);
  });
}

function getParentStructureForInserting(
  indexerAPIListCommentResult: IndexerAPIListCommentRepliesSchemaType,
  parentId: Hex
): IndexerAPIListCommentRepliesSchemaType {
  let parentStructure: IndexerAPIListCommentRepliesSchemaType | undefined;

  everyIndexerAPIListComments(
    indexerAPIListCommentResult,
    (indexerAPIComment) => {
      if (indexerAPIComment.id === parentId) {
        // narrow type, don't safeParse as it create a new object.
        if (!isIndexerAPICommentWithRepliesSchema(indexerAPIComment)) {
          // if we hit the depth limit, this will happen, lets quietly return
          console.warn("optimistical update hits the depth limit");
          return false;
        }

        parentStructure = indexerAPIComment.replies;
        return false;
      }
    }
  );

  return parentStructure ?? indexerAPIListCommentResult;
}

/**
 * Create a indexer API comment data (with id, chain, author...) from a pending comment operation
 * @param pendingCommentOperation
 * @returns
 */
function createIndexerAPICommentDataFromPendingCommentOperation(
  pendingCommentOperation: PendingCommentOperationSchemaType,
  pendingType: PendingOperationSchemaType["pendingType"]
): IndexerAPICommentWithRepliesSchemaType & PendingOperationSchemaType {
  // insert pending comment to the top of the list
  return {
    ...pendingCommentOperation.response.data,
    id: pendingCommentOperation.response.hash,
    chainId: pendingCommentOperation.chainId,
    timestamp: new Date(),
    txHash: pendingCommentOperation.txHash,
    logIndex: 0,
    author: {
      // FIXME: we don't have ens and farcaster data available for the author right from startup
      // once we have it let's fill the data in
      address: pendingCommentOperation.response.data.author,
    },
    deletedAt: null,
    replies: {
      results: [],
      pagination: {
        limit: 0,
        offset: 0,
        hasMore: false,
      },
    },
    pendingType,
  };
}

/**
 * remove items at the end, keep total number of items within the limit
 * @param cachedIndexAPIListComments
 */
function popOutOfLimitItemsFromList(
  cachedIndexAPIListComments: IndexerAPIListCommentRepliesSchemaType
) {
  const itemsToPop =
    cachedIndexAPIListComments.results.length -
    cachedIndexAPIListComments.pagination.limit;

  for (let i = 0; i < itemsToPop; i++) {
    cachedIndexAPIListComments.results.pop();
  }
}

function isIndexerAPICommentWithRepliesSchema(
  indexerAPIComment: IndexerAPICommentSchemaType
): indexerAPIComment is IndexerAPICommentWithRepliesSchemaType {
  try {
    IndexerAPICommentWithRepliesSchema.parse(indexerAPIComment);
    return true;
  } catch {
    return false;
  }
}
