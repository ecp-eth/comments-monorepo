import { db } from "ponder:api";
import { and, desc, eq, inArray, isNotNull, isNull, or } from "ponder";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import type { SQL } from "drizzle-orm";
import schema from "ponder:schema";
import { env } from "../../env";
import type { Hex } from "@ecp.eth/sdk/core";
import { REPLIES_PER_COMMENT } from "../../lib/constants";

export interface FetchCommentWithRepliesParams {
  viewer?: Hex;
  chainId: number[];
  mode: "flat" | "nested";
  commentType?: number;
  isReplyDeleted?: boolean;
}

/**
 * Fetches a comment with its replies based on a main condition.
 * This function handles building all the necessary conditions and fetching
 * the comment with its relations (replies, viewer reactions, etc.).
 *
 * @param mainCondition - The main SQL condition to filter the comment (e.g., eq(schema.comment.id, ...) or eq(schema.comment.path, ...))
 * @param params - Query parameters for filtering and formatting
 * @returns The comment with its relations, or null if not found
 */
export async function fetchCommentWithReplies(
  mainCondition: SQL<unknown>,
  params: FetchCommentWithRepliesParams,
) {
  const { viewer, chainId, mode, commentType, isReplyDeleted } = params;

  const sharedConditions: (SQL<unknown> | undefined)[] = [
    mainCondition,
    chainId.length === 1
      ? eq(schema.comment.chainId, chainId[0]!)
      : inArray(schema.comment.chainId, chainId),
  ];

  const repliesConditions: (SQL<unknown> | undefined)[] = [
    isReplyDeleted != null
      ? isReplyDeleted
        ? isNotNull(schema.comment.deletedAt)
        : isNull(schema.comment.deletedAt)
      : undefined,
  ];
  const viewerReactionsConditions: (SQL<unknown> | undefined)[] = [];

  // Apply moderation filtering to replies
  if (env.MODERATION_ENABLED) {
    const approvedComments = eq(schema.comment.moderationStatus, "approved");

    if (viewer) {
      const approvedOrViewersComments = or(
        approvedComments,
        eq(schema.comment.author, viewer),
      );

      repliesConditions.push(approvedOrViewersComments);
    } else {
      repliesConditions.push(approvedComments);
    }
  }

  if (viewer) {
    viewerReactionsConditions.push(
      eq(schema.comment.author, viewer as `0x${string}`),
      eq(schema.comment.commentType, COMMENT_TYPE_REACTION),
      isNull(schema.comment.deletedAt),
    );
  }

  const comment = await db.query.comment.findFirst({
    with: {
      [mode === "flat" ? "flatReplies" : "replies"]: {
        where: and(
          ...repliesConditions,
          commentType != null
            ? eq(schema.comment.commentType, commentType)
            : undefined,
        ),
        orderBy: [desc(schema.comment.createdAt), desc(schema.comment.id)],
        limit: REPLIES_PER_COMMENT + 1,
        with: {
          viewerReactions: viewer
            ? {
                where: and(...repliesConditions, ...viewerReactionsConditions),
              }
            : undefined,
        },
      },
      viewerReactions: viewer
        ? {
            where: and(...repliesConditions, ...viewerReactionsConditions),
          }
        : undefined,
    },
    where: and(...sharedConditions),
  });

  return comment;
}
