import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  GetCommentsPendingModerationQuerySchema,
} from "../../lib/schemas";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, lt, or } from "ponder";
import { authMiddleware } from "../../middleware/auth";
import { IndexerAPIModerationGetPendingCommentsOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { resolveUserDataAndFormatListCommentsResponse } from "../../lib/response-formatters";

const getPendingCommentsRoute = createRoute({
  method: "get",
  path: "/api/moderate-comments",
  middleware: [authMiddleware()],
  tags: ["comments"],
  description: "Get a list of comments pending moderation",
  request: {
    query: GetCommentsPendingModerationQuerySchema,
  },
  responses: {
    200: {
      description: "List of pending comments",
      content: {
        "application/json": {
          schema: IndexerAPIModerationGetPendingCommentsOutputSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not valid",
    },
    401: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When user is not authenticated",
    },
  },
});

export function setupGetPendingModerationComments(app: OpenAPIHono) {
  app.openapi(getPendingCommentsRoute, async (c) => {
    const { cursor, limit, sort } = c.req.valid("query");

    const hasPreviousCommentsQuery = cursor
      ? db.query.comments
          .findFirst({
            where: and(
              eq(schema.comments.moderationStatus, "pending"),
              // use opposite order for asc and desc
              ...(sort === "asc"
                ? [
                    or(
                      and(
                        eq(schema.comments.createdAt, cursor.createdAt),
                        lt(schema.comments.id, cursor.id),
                      ),
                      lt(schema.comments.createdAt, cursor.createdAt),
                    ),
                  ]
                : []),
              ...(sort === "desc"
                ? [
                    or(
                      and(
                        eq(schema.comments.createdAt, cursor.createdAt),
                        gt(schema.comments.id, cursor.id),
                      ),
                      gt(schema.comments.createdAt, cursor.createdAt),
                    ),
                  ]
                : []),
            ),
            orderBy:
              sort === "desc"
                ? [asc(schema.comments.createdAt), asc(schema.comments.id)]
                : [desc(schema.comments.createdAt), desc(schema.comments.id)],
          })
          .execute()
      : undefined;

    const commentsQuery = db.query.comments.findMany({
      where: and(
        eq(schema.comments.moderationStatus, "pending"),
        ...(sort === "desc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comments.createdAt, cursor.createdAt),
                  lt(schema.comments.id, cursor.id),
                ),
                lt(schema.comments.createdAt, cursor.createdAt),
              ),
            ]
          : []),
        ...(sort === "asc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comments.createdAt, cursor.createdAt),
                  gt(schema.comments.id, cursor.id),
                ),
                gt(schema.comments.createdAt, cursor.createdAt),
              ),
            ]
          : []),
      ),
      orderBy:
        sort === "desc"
          ? [desc(schema.comments.createdAt), desc(schema.comments.id)]
          : [asc(schema.comments.createdAt), asc(schema.comments.id)],
      limit: limit + 1,
    });

    const [comments, previousComment] = await Promise.all([
      commentsQuery.execute(),
      hasPreviousCommentsQuery,
    ]);

    const formattedComments =
      await resolveUserDataAndFormatListCommentsResponse({
        comments,
        limit,
        replyLimit: 0,
        previousComment,
      });

    return c.json(
      IndexerAPIModerationGetPendingCommentsOutputSchema.parse(
        formattedComments,
      ),
      200,
    );
  });

  return app;
}
