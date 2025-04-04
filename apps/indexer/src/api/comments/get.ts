import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, isNull, lt, or } from "ponder";
import { IndexerAPIListCommentsSchema } from "@ecp.eth/sdk/schemas";
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
      author ? eq(schema.comment.author, author) : undefined,
      isNull(schema.comment.parentId),
      targetUri ? eq(schema.comment.targetUri, targetUri) : undefined,
      appSigner ? eq(schema.comment.appSigner, appSigner) : undefined,
    ];

    if (env.MODERATION_ENABLED) {
      if (viewer) {
        sharedConditions.push(
          or(
            eq(schema.comment.moderationStatus, "approved"),
            eq(schema.comment.author, viewer)
          )
        );
      } else {
        sharedConditions.push(eq(schema.comment.moderationStatus, "approved"));
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
                        eq(schema.comment.timestamp, cursor.timestamp),
                        lt(schema.comment.id, cursor.id)
                      ),
                      lt(schema.comment.timestamp, cursor.timestamp)
                    ),
                  ]
                : []),
              ...(sort === "desc"
                ? [
                    or(
                      and(
                        eq(schema.comment.timestamp, cursor.timestamp),
                        gt(schema.comment.id, cursor.id)
                      ),
                      gt(schema.comment.timestamp, cursor.timestamp)
                    ),
                  ]
                : [])
            ),
            orderBy:
              sort === "desc"
                ? [asc(schema.comment.timestamp), asc(schema.comment.id)]
                : [desc(schema.comment.timestamp), desc(schema.comment.id)],
          })
          .execute()
      : undefined;

    const repliesConditions: (SQL<unknown> | undefined)[] = [];

    if (env.MODERATION_ENABLED) {
      if (viewer) {
        repliesConditions.push(
          or(
            eq(schema.comment.moderationStatus, "approved"),
            eq(schema.comment.author, viewer)
          )
        );
      } else {
        repliesConditions.push(eq(schema.comment.moderationStatus, "approved"));
      }
    }

    const commentsQuery = db.query.comment.findMany({
      with:
        mode === "flat"
          ? {
              flatReplies: {
                where: and(...repliesConditions),
                orderBy: desc(schema.comment.timestamp),
                limit: REPLIES_PER_COMMENT + 1,
              },
            }
          : {
              replies: {
                where: and(...repliesConditions),
                orderBy: desc(schema.comment.timestamp),
                limit: REPLIES_PER_COMMENT + 1,
              },
            },
      where: and(
        ...sharedConditions,
        ...(sort === "desc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comment.timestamp, cursor.timestamp),
                  lt(schema.comment.id, cursor.id)
                ),
                lt(schema.comment.timestamp, cursor.timestamp)
              ),
            ]
          : []),
        ...(sort === "asc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.comment.timestamp, cursor.timestamp),
                  gt(schema.comment.id, cursor.id)
                ),
                gt(schema.comment.timestamp, cursor.timestamp)
              ),
            ]
          : [])
      ),
      orderBy:
        sort === "desc"
          ? [desc(schema.comment.timestamp), desc(schema.comment.id)]
          : [asc(schema.comment.timestamp), asc(schema.comment.id)],
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
        previousComment,
        replyLimit: REPLIES_PER_COMMENT,
      });

    return c.json(formattedComments, 200);
  });

  return app;
};
