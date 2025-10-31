import { db } from "ponder:api";
import schema from "ponder:schema";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
} from "ponder";
import { IndexerAPIListCommentsOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { resolveUserDataAndFormatListCommentsResponse } from "../../lib/response-formatters";
import {
  APIBadRequestResponseSchema,
  GetCommentsQuerySchema,
} from "../../lib/schemas";
import { REPLIES_PER_COMMENT } from "../../lib/constants";
import { env } from "../../env";
import type { SQL } from "drizzle-orm";
import {
  convertExcludeModerationLabelsToConditions,
  normalizeModerationStatusFilter,
} from "./helpers";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";

const getCommentsRoute = createRoute({
  method: "get",
  path: "/api/comments",
  tags: ["comments"],
  description: "Retrieve a list of comments based on the criteria",
  request: {
    query: GetCommentsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIListCommentsOutputSchema,
        },
      },
      description: "Retrieve a list of comments",
    },
    400: {
      content: {
        "application/json": {
          schema: APIBadRequestResponseSchema,
        },
      },
      description: "Bad request",
    },
  },
});

/**
 * Setup Comments API
 *
 * @param app - The Hono app instance
 * @returns hono app instance
 */
export default (app: OpenAPIHono) => {
  app.openapi(getCommentsRoute, async (c) => {
    const {
      author,
      targetUri,
      app,
      sort,
      limit,
      cursor,
      viewer,
      mode,
      channelId,
      commentType,
      moderationStatus,
      moderationScore,
      chainId,
      excludeByModerationLabels: excludeModerationLabels,
      isDeleted,
    } = c.req.valid("query");

    const sharedConditions: (SQL<unknown> | undefined)[] = [
      author ? eq(schema.comment.author, author) : undefined,
      isNull(schema.comment.parentId),
      targetUri ? eq(schema.comment.targetUri, targetUri) : undefined,
      app ? eq(schema.comment.app, app) : undefined,
      channelId != null ? eq(schema.comment.channelId, channelId) : undefined,
      commentType != null
        ? eq(schema.comment.commentType, commentType)
        : undefined,
      chainId.length === 1
        ? eq(schema.comment.chainId, chainId[0]!)
        : inArray(schema.comment.chainId, chainId),
      excludeModerationLabels
        ? convertExcludeModerationLabelsToConditions(excludeModerationLabels)
        : undefined,
      moderationScore != null
        ? lte(schema.comment.moderationClassifierScore, moderationScore)
        : undefined,
      isDeleted != null
        ? isDeleted
          ? isNotNull(schema.comment.deletedAt)
          : isNull(schema.comment.deletedAt)
        : undefined,
    ];

    const repliesConditions: (SQL<unknown> | undefined)[] = [
      // we don't need to filter by:
      // - channelId because replies can be created only in same channel
      // - chainId because comments can't reply to comments outside of the chain (parentId is validated)
      app ? eq(schema.comment.app, app) : undefined,
      isDeleted != null
        ? isDeleted
          ? isNotNull(schema.comment.deletedAt)
          : isNull(schema.comment.deletedAt)
        : undefined,
      // replies should be same as the containing comment type
      commentType != null
        ? eq(schema.comment.commentType, commentType)
        : undefined,
      excludeModerationLabels
        ? convertExcludeModerationLabelsToConditions(excludeModerationLabels)
        : undefined,
      moderationScore != null
        ? lte(schema.comment.moderationClassifierScore, moderationScore)
        : undefined,
    ];
    const viewerReactionsConditions: (SQL<unknown> | undefined)[] = [];

    const moderationStatusFilter =
      normalizeModerationStatusFilter(moderationStatus);

    // if we want to filter by moderation status then it doesn't matter who the viewer is
    if (moderationStatusFilter.length > 0) {
      sharedConditions.push(
        inArray(schema.comment.moderationStatus, moderationStatusFilter),
      );
      repliesConditions.push(
        inArray(schema.comment.moderationStatus, moderationStatusFilter),
      );
      viewerReactionsConditions.push(
        inArray(schema.comment.moderationStatus, moderationStatusFilter),
      );
    } else if (env.MODERATION_ENABLED) {
      const approvedComments = eq(schema.comment.moderationStatus, "approved");

      if (viewer) {
        const approvedOrViewersComments = or(
          approvedComments,
          eq(schema.comment.author, viewer),
        );

        sharedConditions.push(approvedOrViewersComments);
        repliesConditions.push(approvedOrViewersComments);
        viewerReactionsConditions.push(approvedOrViewersComments);
      } else {
        sharedConditions.push(approvedComments);
        repliesConditions.push(approvedComments);
        viewerReactionsConditions.push(approvedComments);
      }
    }

    if (viewer) {
      viewerReactionsConditions.push(
        eq(schema.comment.author, viewer),
        eq(schema.comment.commentType, COMMENT_TYPE_REACTION),
        isNull(schema.comment.deletedAt),
      );
    }

    const previousCommentsQuery = cursor
      ? db.query.comment
          .findFirst({
            where: and(
              ...sharedConditions,
              // use opposite order for asc and desc
              ...(sort === "asc"
                ? [
                    or(
                      and(
                        eq(schema.comment.createdAt, cursor.createdAt),
                        lte(schema.comment.id, cursor.id),
                      ),
                      lt(schema.comment.createdAt, cursor.createdAt),
                    ),
                  ]
                : []),
              ...(sort === "desc"
                ? [
                    or(
                      and(
                        eq(schema.comment.createdAt, cursor.createdAt),
                        gte(schema.comment.id, cursor.id),
                      ),
                      gt(schema.comment.createdAt, cursor.createdAt),
                    ),
                  ]
                : []),
            ),
            orderBy:
              sort === "desc"
                ? [asc(schema.comment.createdAt), asc(schema.comment.id)]
                : [desc(schema.comment.createdAt), desc(schema.comment.id)],
          })
          .execute()
      : undefined;

    const commentsQuery = db.query.comment.findMany({
      with: {
        [mode === "flat" ? "flatReplies" : "replies"]: {
          where: and(...repliesConditions),
          orderBy: [desc(schema.comment.createdAt), desc(schema.comment.id)],
          limit: REPLIES_PER_COMMENT + 1,
          with: {
            viewerReactions: viewer
              ? {
                  where: and(...viewerReactionsConditions),
                }
              : undefined,
          },
        },
        viewerReactions: viewer
          ? {
              where: and(...viewerReactionsConditions),
            }
          : undefined,
      },
      where: and(
        ...sharedConditions,
        ...(sort === "desc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comment.createdAt, cursor.createdAt),
                  lt(schema.comment.id, cursor.id),
                ),
                lt(schema.comment.createdAt, cursor.createdAt),
              ),
            ]
          : []),
        ...(sort === "asc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comment.createdAt, cursor.createdAt),
                  gt(schema.comment.id, cursor.id),
                ),
                gt(schema.comment.createdAt, cursor.createdAt),
              ),
            ]
          : []),
      ),
      orderBy:
        sort === "desc"
          ? [desc(schema.comment.createdAt), desc(schema.comment.id)]
          : [asc(schema.comment.createdAt), asc(schema.comment.id)],
      limit: limit + 1,
    });

    const [comments, previousComment] = await Promise.all([
      commentsQuery,
      previousCommentsQuery,
    ]);

    const formattedComments =
      await resolveUserDataAndFormatListCommentsResponse({
        comments,
        limit,
        previousComment,
        replyLimit: REPLIES_PER_COMMENT,
        replyCountsConditions: {
          mode,
          app,
          isDeleted,
          commentType,
          excludeModerationLabels,
          moderationScore,
          moderationStatus: moderationStatusFilter,
        },
      });

    return c.json(
      IndexerAPIListCommentsOutputSchema.parse(formattedComments),
      200,
    );
  });

  return app;
};
