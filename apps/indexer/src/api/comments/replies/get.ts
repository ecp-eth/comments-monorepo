import { db } from "ponder:api";
import schema from "ponder:schema";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  lt,
  lte,
  or,
  isNull,
  inArray,
  isNotNull,
} from "ponder";
import { IndexerAPIListCommentRepliesOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { resolveUserDataAndFormatListCommentsResponse } from "../../../lib/response-formatters";
import {
  GetCommentRepliesQuerySchema,
  GetCommentRepliesParamSchema,
  APIErrorResponseSchema,
} from "../../../lib/schemas";
import { REPLIES_PER_COMMENT } from "../../../lib/constants";
import { env } from "../../../env";
import {
  convertExcludeModerationLabelsToConditions,
  normalizeModerationStatusFilter,
} from "../helpers";
import type { SQL } from "drizzle-orm";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";

const getCommentsRoute = createRoute({
  method: "get",
  path: "/api/comments/{commentId}/replies",
  tags: ["comments"],
  description:
    "Return replies to a comment according to the comment id and additional criteria",
  request: {
    query: GetCommentRepliesQuerySchema,
    params: GetCommentRepliesParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIListCommentRepliesOutputSchema,
        },
      },
      description: "Retrieve replies to the specified comment",
    },
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not valid",
    },
  },
});

export default (app: OpenAPIHono) => {
  app.openapi(getCommentsRoute, async (c) => {
    const {
      app,
      sort,
      limit,
      cursor,
      mode,
      viewer,
      channelId,
      commentType,
      moderationStatus,
      chainId,
      excludeByModerationLabels,
      author,
      moderationScore,
      isDeleted,
    } = c.req.valid("query");
    const { commentId } = c.req.valid("param");

    const sharedConditions: (SQL<unknown> | undefined)[] = [
      app ? eq(schema.comment.app, app) : undefined,
      author ? eq(schema.comment.author, author) : undefined,
      channelId != null ? eq(schema.comment.channelId, channelId) : undefined,
      commentType != null
        ? eq(schema.comment.commentType, commentType)
        : undefined,
      chainId.length === 1
        ? eq(schema.comment.chainId, chainId[0]!)
        : inArray(schema.comment.chainId, chainId),
      excludeByModerationLabels
        ? convertExcludeModerationLabelsToConditions(excludeByModerationLabels)
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
    const viewerReactionsConditions: (SQL<unknown> | undefined)[] = [];

    if (mode === "flat") {
      const rootComment = await db.query.comment.findFirst({
        where: and(
          eq(schema.comment.id, commentId),
          isNull(schema.comment.rootCommentId),
        ),
      });

      if (!rootComment) {
        return c.json(
          {
            message: "Flat mode is not supported for non-root comments",
          },
          400,
        );
      }

      sharedConditions.push(eq(schema.comment.rootCommentId, rootComment.id));
    } else {
      sharedConditions.push(eq(schema.comment.parentId, commentId));
    }

    const moderationStatusFilter =
      normalizeModerationStatusFilter(moderationStatus);

    if (moderationStatusFilter.length > 0) {
      sharedConditions.push(
        inArray(schema.comment.moderationStatus, moderationStatusFilter),
      );
      viewerReactionsConditions.push(
        inArray(schema.comment.moderationStatus, moderationStatusFilter),
      );
    } else if (env.MODERATION_ENABLED) {
      const onlyApproved = eq(schema.comment.moderationStatus, "approved");

      if (viewer) {
        sharedConditions.push(
          or(onlyApproved, eq(schema.comment.author, viewer)),
        );
        viewerReactionsConditions.push(
          or(onlyApproved, eq(schema.comment.author, viewer)),
        );
      } else {
        sharedConditions.push(onlyApproved);
        viewerReactionsConditions.push(onlyApproved);
      }
    }

    if (viewer) {
      viewerReactionsConditions.push(
        eq(schema.comment.author, viewer),
        eq(schema.comment.commentType, COMMENT_TYPE_REACTION),
        isNull(schema.comment.deletedAt),
      );
    }

    // use reverse order to find previous reply
    const previousReplyQuery = cursor
      ? db.query.comment
          .findFirst({
            where: and(
              ...sharedConditions,
              ...(sort === "asc"
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
              ...(sort === "desc"
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
                ? [asc(schema.comment.createdAt), asc(schema.comment.id)]
                : [desc(schema.comment.createdAt), desc(schema.comment.id)],
          })
          .execute()
      : undefined;

    const repliesQuery = db.query.comment.findMany({
      with: {
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

    const [replies, previousReply] = await Promise.all([
      repliesQuery.execute(),
      previousReplyQuery,
    ]);

    const formattedComments =
      await resolveUserDataAndFormatListCommentsResponse({
        comments: replies,
        limit,
        previousComment: previousReply,
        replyLimit: REPLIES_PER_COMMENT,
        replyCountsConditions: {
          mode,
          app,
          commentType,
          excludeModerationLabels: excludeByModerationLabels,
          isDeleted,
          moderationScore,
          moderationStatus: moderationStatusFilter,
        },
      });

    return c.json(
      IndexerAPIListCommentRepliesOutputSchema.parse(formattedComments),
      200,
    );
  });

  return app;
};
