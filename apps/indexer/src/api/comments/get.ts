import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, isNull, lt, or } from "ponder";
import { IndexerAPIListCommentsSchema } from "@ecp.eth/sdk/indexer/schemas";
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
          schema: IndexerAPIListCommentsSchema,
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
    const { author, targetUri, appSigner, sort, limit, cursor, viewer, mode } =
      c.req.valid("query");

    const sharedConditions = [
      author ? eq(schema.comments.author, author) : undefined,
      isNull(schema.comments.parentId),
      targetUri ? eq(schema.comments.targetUri, targetUri) : undefined,
      appSigner ? eq(schema.comments.appSigner, appSigner) : undefined,
    ];

    const repliesConditions: (SQL<unknown> | undefined)[] = [];

    if (env.MODERATION_ENABLED) {
      const approvedComments = eq(schema.comments.moderationStatus, "approved");

      if (viewer) {
        const approvedOrViewersComments = or(
          approvedComments,
          eq(schema.comments.author, viewer)
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
                        eq(schema.comments.timestamp, cursor.timestamp),
                        lt(schema.comments.id, cursor.id)
                      ),
                      lt(schema.comments.timestamp, cursor.timestamp)
                    ),
                  ]
                : []),
              ...(sort === "desc"
                ? [
                    or(
                      and(
                        eq(schema.comments.timestamp, cursor.timestamp),
                        gt(schema.comments.id, cursor.id)
                      ),
                      gt(schema.comments.timestamp, cursor.timestamp)
                    ),
                  ]
                : [])
            ),
            orderBy:
              sort === "desc"
                ? [asc(schema.comments.timestamp), asc(schema.comments.id)]
                : [desc(schema.comments.timestamp), desc(schema.comments.id)],
          })
          .execute()
      : undefined;

    const commentsQuery = db.query.comments.findMany({
      with: {
        [mode === "flat" ? "flatReplies" : "replies"]: {
          where: and(...repliesConditions),
          orderBy: [desc(schema.comments.timestamp), desc(schema.comments.id)],
          limit: REPLIES_PER_COMMENT + 1,
        },
      },
      where: and(
        ...sharedConditions,
        ...(sort === "desc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comments.timestamp, cursor.timestamp),
                  lt(schema.comments.id, cursor.id)
                ),
                lt(schema.comments.timestamp, cursor.timestamp)
              ),
            ]
          : []),
        ...(sort === "asc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comments.timestamp, cursor.timestamp),
                  gt(schema.comments.id, cursor.id)
                ),
                gt(schema.comments.timestamp, cursor.timestamp)
              ),
            ]
          : [])
      ),
      orderBy:
        sort === "desc"
          ? [desc(schema.comments.timestamp), desc(schema.comments.id)]
          : [asc(schema.comments.timestamp), asc(schema.comments.id)],
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

    return c.json(IndexerAPIListCommentsSchema.parse(formattedComments), 200);
  });

  return app;
};
