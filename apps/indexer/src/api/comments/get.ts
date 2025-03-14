import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, isNull, lt, or } from "ponder";
import { IndexerAPIListCommentsSchema } from "@ecp.eth/sdk/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { resolveUserDataAndFormatListCommentsResponse } from "../../lib/response-formatters";
import { GetCommentsQuerySchema } from "../../lib/schemas";
import { REPLIES_PER_COMMENT } from "../../lib/constants";

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
    const { author, targetUri, appSigner, sort, limit, cursor } =
      c.req.valid("query");

    const hasPreviousCommentsQuery = cursor
      ? db.query.comment
          .findFirst({
            where: and(
              author ? eq(schema.comment.author, author) : undefined,
              isNull(schema.comment.parentId),
              targetUri ? eq(schema.comment.targetUri, targetUri) : undefined,
              appSigner ? eq(schema.comment.appSigner, appSigner) : undefined,
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

    const commentsQuery = db.query.comment.findMany({
      with: {
        replies: {
          orderBy: desc(schema.comment.timestamp),
          limit: REPLIES_PER_COMMENT + 1,
        },
      },
      where: and(
        author ? eq(schema.comment.author, author) : undefined,
        isNull(schema.comment.parentId),
        targetUri ? eq(schema.comment.targetUri, targetUri) : undefined,
        appSigner ? eq(schema.comment.appSigner, appSigner) : undefined,
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
