import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, isNull, lt, or } from "ponder";
import { IndexerAPIListCommentsOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { resolveUserDataAndFormatListCommentsResponse } from "../../lib/response-formatters";
import { GetCommentsQuerySchema } from "../../lib/schemas";
import { REPLIES_PER_COMMENT } from "../../lib/constants";
import { env } from "../../env";
import type { SQL } from "drizzle-orm";

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
    } = c.req.valid("query");

    const sharedConditions = [
      author ? eq(schema.comment.author, author) : undefined,
      isNull(schema.comment.parentId),
      targetUri ? eq(schema.comment.targetUri, targetUri) : undefined,
      app ? eq(schema.comment.app, app) : undefined,
      channelId != null ? eq(schema.comment.channelId, channelId) : undefined,
      commentType != null
        ? eq(schema.comment.commentType, commentType)
        : undefined,
    ];

    const repliesConditions: (SQL<unknown> | undefined)[] = [];

    if (env.MODERATION_ENABLED) {
      const approvedComments = eq(schema.comment.moderationStatus, "approved");

      if (viewer) {
        const approvedOrViewersComments = or(
          approvedComments,
          eq(schema.comment.author, viewer),
        );

        sharedConditions.push(approvedOrViewersComments);
        repliesConditions.push(approvedOrViewersComments);
      } else {
        sharedConditions.push(approvedComments);
        repliesConditions.push(approvedComments);
      }
    }

    const hasPreviousCommentsQuery = cursor
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

    const commentsQuery = db.query.comment.findMany({
      with: {
        [mode === "flat" ? "flatReplies" : "replies"]: {
          where: and(...repliesConditions),
          orderBy: [desc(schema.comment.createdAt), desc(schema.comment.id)],
          limit: REPLIES_PER_COMMENT + 1,
        },
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
      hasPreviousCommentsQuery,
    ]);

    const formattedComments =
      await resolveUserDataAndFormatListCommentsResponse({
        comments,
        limit,
        previousComment,
        replyLimit: REPLIES_PER_COMMENT,
      });

    return c.json(
      IndexerAPIListCommentsOutputSchema.parse(formattedComments),
      200,
    );
  });

  return app;
};
