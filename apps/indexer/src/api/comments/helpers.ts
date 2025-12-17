import type { IndexerAPICommentModerationStatusSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { type CommentModerationLabel } from "../../services/types";
import { and, or, sql, type SQL } from "drizzle-orm";
import { env } from "../../env";
import { schema } from "../../../schema";
import { db } from "ponder:api";
import { desc, eq, inArray, isNotNull, isNull } from "ponder";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import { REPLIES_PER_COMMENT } from "../../lib/constants";
import type { Hex } from "@ecp.eth/sdk/core";
import {
  createUserDataAndFormatSingleCommentResponseResolver,
  mapReplyCountsByCommentId,
} from "../../lib/response-formatters";
import { farcasterByAddressResolverService } from "../../services/farcaster-by-address-resolver";
import { ensByAddressResolverService } from "../../services/ens-by-address-resolver";

export function normalizeModerationStatusFilter(
  moderationStatus:
    | undefined
    | IndexerAPICommentModerationStatusSchemaType
    | IndexerAPICommentModerationStatusSchemaType[],
): IndexerAPICommentModerationStatusSchemaType[] {
  if (typeof moderationStatus === "string") {
    return [moderationStatus];
  }

  if (Array.isArray(moderationStatus) && moderationStatus.length > 0) {
    return moderationStatus;
  }

  return [];
}

export function convertExcludeModerationLabelsToConditions(
  excludeModerationLabels: CommentModerationLabel[],
): SQL | undefined {
  if (excludeModerationLabels.length === 0) {
    return;
  }

  const clauses: (SQL | undefined)[] = [];

  for (const label of excludeModerationLabels) {
    clauses.push(
      or(
        sql`NOT (${schema.comment.moderationClassifierResult} ? ${label})`,
        sql`(${schema.comment.moderationClassifierResult}->>${label})::float <= ${getModerationClassificationScoreThreshold(label)}`,
      ),
    );
  }

  return and(...clauses);
}

function getModerationClassificationScoreThreshold(
  label: CommentModerationLabel,
): number {
  const key =
    `MODERATION_CLASSIFICATION_${label.toUpperCase()}_THRESHOLD` as keyof typeof env;

  if (key in env && typeof env[key] === "number") {
    return env[key];
  }

  return env.MODERATION_DEFAULT_CLASSIFICATION_SCORE_THRESHOLD;
}

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

/**
 * Formats a comment with its replies for API response.
 * This function handles collecting author addresses, resolving ENS/Farcaster data,
 * mapping reply counts, and formatting the comment response.
 *
 * @param comment - The comment with its relations (must not be null)
 * @param params - Parameters for formatting (mode, commentType, isReplyDeleted)
 * @returns The formatted comment ready for API response
 */
export async function formatCommentWithRepliesResponse(
  comment: NonNullable<Awaited<ReturnType<typeof fetchCommentWithReplies>>>,
  params: {
    mode: "flat" | "nested";
    commentType?: number;
    isReplyDeleted?: boolean;
  },
) {
  const { mode, commentType, isReplyDeleted } = params;

  const authorAddresses = new Set<Hex>();

  if (comment.author) {
    authorAddresses.add(comment.author);
  }

  const replies = mode === "flat" ? comment.flatReplies : comment.replies;

  for (const reply of replies) {
    if (reply.author) {
      authorAddresses.add(reply.author);
    }
  }

  const [resolvedAuthorsEnsData, resolvedAuthorsFarcasterData, replyCounts] =
    await Promise.all([
      ensByAddressResolverService.loadMany([...authorAddresses]),
      farcasterByAddressResolverService.loadMany([...authorAddresses]),
      mapReplyCountsByCommentId([comment], {
        mode,
        isDeleted: isReplyDeleted,
        commentType,
      }),
    ]);

  const resolveUserDataAndFormatSingleCommentResponse =
    createUserDataAndFormatSingleCommentResponseResolver({
      replyLimit: REPLIES_PER_COMMENT,
      resolvedAuthorsEnsData,
      resolvedAuthorsFarcasterData,
      replyCounts,
    });

  const formattedComment =
    await resolveUserDataAndFormatSingleCommentResponse(comment);

  return formattedComment;
}
