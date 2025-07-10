import { getCommentCursor } from "@ecp.eth/sdk/indexer";

import {
  Comment,
  CommentPageSchemaType,
  ListCommentsQueryDataSchema,
  ListCommentsQueryPageParamsSchemaType,
  type ListCommentsQueryDataSchemaType,
  type PendingPostCommentOperationSchemaType,
} from "../schemas.js";
import {
  InfiniteData,
  type QueryKey,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { useMemo } from "react";
import { isSameHex, getModerationStatus } from "../helpers.js";

type OnReactionSubmissionParams = {
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Pending operation
   */
  pendingOperation: PendingPostCommentOperationSchemaType;
};

type OnReactionSubmissionStart = (params: OnReactionSubmissionParams) => void;
type OnReactionSubmissionSuccess = (params: OnReactionSubmissionParams) => void;
type OnReactionSubmissionError = (params: OnReactionSubmissionParams) => void;

type ReactionSubmissionAPI = {
  start: OnReactionSubmissionStart;
  success: OnReactionSubmissionSuccess;
  error: OnReactionSubmissionError;
};

export function useReactionSubmission(
  reactionType: string,
): ReactionSubmissionAPI {
  const client = useQueryClient();

  const start = useCallback<OnReactionSubmissionStart>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return insertPendingReactionToPage(
            queryData,
            params.pendingOperation,
            reactionType,
          );
        },
      );
    },
    [client, reactionType],
  );

  const success = useCallback<OnReactionSubmissionSuccess>(() => {
    // no need to do anything as the data will be overwritten by latest data
    console.log("Reaction submitted");
  }, []);

  const error = useCallback<OnReactionSubmissionError>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return revertPendingReactionWhenFailed(
            queryData,
            params.pendingOperation,
            reactionType,
          );
        },
      );

      console.warn("Failed to like the comment");
    },
    [client, reactionType],
  );

  return useMemo(
    () => ({
      start,
      success,
      error,
    }),
    [start, success, error],
  );
}

/**
 * Insert a pending reaction to the first page of the query data
 *
 * This function mutates the queryData argument
 *
 */
function insertPendingReactionToPage(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingPostCommentOperationSchemaType,
  reactionType: string,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  if (!queryData.pages[0]) {
    return queryData;
  }

  const { response, txHash, chainId, zeroExSwap } = pendingOperation;

  const results = queryData.pages[0].results;

  const parentComment = results.find(
    (result) => result.id === pendingOperation.response.data.parentId,
  );

  if (!parentComment) {
    console.warn("Parent comment not found");
    return queryData;
  }

  const reaction: Comment = {
    ...response.data,
    author: pendingOperation.resolvedAuthor ?? {
      address: response.data.author,
    },
    cursor: getCommentCursor(response.data.id, new Date()),
    deletedAt: null,
    logIndex: 0,
    txHash,
    chainId,
    createdAt: new Date(),
    updatedAt: new Date(),
    revision: 0,
    metadata: [],
    hookMetadata: [],
    moderationStatus: getModerationStatus(
      queryData.pages[0].extra,
      response.data,
    ),
    moderationStatusChangedAt: new Date(),
    moderationClassifierResult: {},
    moderationClassifierScore: 0,
    zeroExSwap: zeroExSwap ?? null,
    references: [],
  };

  // Initialize viewerReactions if it doesn't exist and add the reaction
  parentComment.viewerReactions = parentComment.viewerReactions ?? {};
  parentComment.viewerReactions[reactionType] = [reaction];

  // Initialize reactionCounts if it doesn't exist and increment the count
  parentComment.reactionCounts = parentComment.reactionCounts ?? {};
  parentComment.reactionCounts[reactionType] =
    (parentComment.reactionCounts[reactionType] ?? 0) + 1;

  return queryData;
}

/**
 * Mark a pending post comment as failed
 *
 * This function mutates the queryData argument
 */
function revertPendingReactionWhenFailed(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingPostCommentOperationSchemaType,
  reactionType: string,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  const reactionId = pendingOperation.response.data.id;
  const parentId = pendingOperation.response.data.parentId;

  const parentComment = queryData.pages
    .flatMap((page) => page.results)
    .find((result) => result.id === parentId);

  if (!parentComment) {
    return queryData;
  }

  if (!parentComment.reactionCounts || !parentComment.viewerReactions) {
    return queryData;
  }

  parentComment.reactionCounts[reactionType] =
    (parentComment.reactionCounts?.[reactionType] ?? 0) - 1;

  parentComment.viewerReactions[reactionType] =
    parentComment.viewerReactions[reactionType]?.filter(
      (reaction) => !isSameHex(reaction.id, reactionId),
    ) ?? [];

  return queryData;
}
