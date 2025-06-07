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
      author ? eq(schema.comments.author, author) : undefined,
      isNull(schema.comments.parentId),
      targetUri ? eq(schema.comments.targetUri, targetUri) : undefined,
      app ? eq(schema.comments.app, app) : undefined,
      channelId != null ? eq(schema.comments.channelId, channelId) : undefined,
      commentType
        ? eq(schema.comments.commentType, parseInt(commentType, 10))
        : undefined,
    ];

    const repliesConditions: (SQL<unknown> | undefined)[] = [];

    if (env.MODERATION_ENABLED) {
      const approvedComments = eq(schema.comments.moderationStatus, "approved");

      if (viewer) {
        const approvedOrViewersComments = or(
          approvedComments,
          eq(schema.comments.author, viewer),
        );

        sharedConditions.push(approvedOrViewersComments);
        repliesConditions.push(approvedOrViewersComments);
      } else {
        sharedConditions.push(approvedComments);
        repliesConditions.push(approvedComments);
      }
    }

    const hasPreviousCommentsQuery = cursor
      ? db.query.comments
          .findFirst({
            where: and(
              ...sharedConditions,
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
      with: {
        [mode === "flat" ? "flatReplies" : "replies"]: {
          where: and(...repliesConditions),
          orderBy: [desc(schema.comments.createdAt), desc(schema.comments.id)],
          limit: REPLIES_PER_COMMENT + 1,
        },
      },
      where: and(
        ...sharedConditions,
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
