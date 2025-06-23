import {
  CommentPageSchemaType,
  ListCommentsQueryDataSchema,
  ListCommentsQueryPageParamsSchemaType,
  type ListCommentsQueryDataSchemaType,
  type Comment,
} from "../schemas.js";
import {
  InfiniteData,
  type QueryKey,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useMemo } from "react";
import { isSameHex } from "../helpers.js";
import type { Hex } from "viem";

type OnReactionRemovalParams = {
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * The reaction ID to remove
   */
  reactionId: Hex;
  /**
   * The parent comment ID that the reaction belongs to
   */
  parentCommentId: Hex;
};

type OnReactionRemovalStart = (params: OnReactionRemovalParams) => void;
type OnReactionRemovalSuccess = (params: OnReactionRemovalParams) => void;
type OnReactionRemovalError = (params: OnReactionRemovalParams) => void;

type ReactionRemovalAPI = {
  start: OnReactionRemovalStart;
  success: OnReactionRemovalSuccess;
  error: OnReactionRemovalError;
};

export function useReactionRemoval(reactionType: string): ReactionRemovalAPI {
  const client = useQueryClient();
  // Store removed reactions to restore them if the operation fails
  const removedReactions = useRef<Map<Hex, Comment>>(new Map());

  const start = useCallback<OnReactionRemovalStart>(
    ({ queryKey, reactionId, parentCommentId }) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return removeReactionFromPage(
            queryData,
            reactionId,
            parentCommentId,
            reactionType,
            removedReactions.current,
          );
        },
      );
    },
    [client, reactionType],
  );

  const success = useCallback<OnReactionRemovalSuccess>(({ reactionId }) => {
    // Remove the stored reaction since the operation succeeded
    removedReactions.current.delete(reactionId);
  }, []);

  const error = useCallback<OnReactionRemovalError>(
    ({ queryKey, reactionId, parentCommentId }) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return revertReactionRemovalWhenFailed(
            queryData,
            reactionId,
            parentCommentId,
            reactionType,
            removedReactions.current,
          );
        },
      );

      console.warn("Failed to unlike the comment");
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
 * Optimistically remove a reaction from the first page of the query data
 *
 * This function mutates the queryData argument
 */
function removeReactionFromPage(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  reactionId: Hex,
  parentCommentId: Hex,
  reactionType: string,
  removedReactions: Map<Hex, Comment>,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  // Find the parent comment that contains this reaction
  const parentComment = queryData.pages
    .flatMap((page) => page.results)
    .find((result) => isSameHex(result.id, parentCommentId));

  if (!parentComment) {
    console.warn("Parent comment with reaction not found");
    return queryData;
  }

  // Find and store the reaction before removing it
  const reactionToRemove = parentComment.viewerReactions?.[reactionType]?.find(
    (reaction) => isSameHex(reaction.id, reactionId),
  );

  if (!reactionToRemove) {
    console.warn("Reaction not found");
    return queryData;
  }

  // Store the reaction for potential restoration
  removedReactions.set(reactionId, reactionToRemove);

  // Remove the reaction from viewerReactions
  if (parentComment.viewerReactions?.[reactionType]) {
    parentComment.viewerReactions[reactionType] = parentComment.viewerReactions[
      reactionType
    ].filter((reaction) => !isSameHex(reaction.id, reactionId));
  }

  // Decrease the reaction count
  if (parentComment.reactionCounts?.[reactionType] !== undefined) {
    parentComment.reactionCounts[reactionType] = Math.max(
      0,
      (parentComment.reactionCounts[reactionType] ?? 0) - 1,
    );
  }

  return queryData;
}

/**
 * Revert the optimistic reaction removal when the operation fails
 *
 * This function mutates the queryData argument
 */
function revertReactionRemovalWhenFailed(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  reactionId: Hex,
  parentCommentId: Hex,
  reactionType: string,
  removedReactions: Map<Hex, Comment>,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  // Find the parent comment that should contain this reaction
  const parentComment = queryData.pages
    .flatMap((page) => page.results)
    .find((result) => isSameHex(result.id, parentCommentId));

  if (!parentComment) {
    console.warn("Parent comment not found for reaction restoration");
    return queryData;
  }

  // Restore the reaction from storage
  const removedReaction = removedReactions.get(reactionId);

  if (!removedReaction) {
    console.warn("Removed reaction can not be found in cache");
    return queryData;
  }

  // Initialize viewerReactions if it doesn't exist
  if (!parentComment.viewerReactions) {
    parentComment.viewerReactions = {};
  }

  if (!parentComment.viewerReactions[reactionType]) {
    parentComment.viewerReactions[reactionType] = [];
  }

  // Add the reaction back
  parentComment.viewerReactions[reactionType].push(removedReaction);

  // Increase the reaction count back
  if (parentComment.reactionCounts) {
    parentComment.reactionCounts[reactionType] =
      (parentComment.reactionCounts[reactionType] ?? 0) + 1;
  }

  // Remove from storage since we've restored it
  removedReactions.delete(reactionId);

  return queryData;
}
