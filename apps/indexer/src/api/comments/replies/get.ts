import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, lt, or } from "ponder";
import { IndexerAPIListCommentRepliesSchema } from "@ecp.eth/sdk/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { resolveUserDataAndFormatListCommentsResponse } from "../../../lib/response-formatters";
import {
  GetCommentRepliesQuerySchema,
  GetCommentRepliesParamSchema,
} from "../../../lib/schemas";
import { REPLIES_PER_COMMENT } from "../../../lib/constants";

const getCommentsRoute = createRoute({
  method: "get",
  path: "/api/comments/{commentId}/replies",
  tags: ["comments"],
  description:
    "Return a single comments according to the id and additional criteria",
  request: {
    query: GetCommentRepliesQuerySchema,
    params: GetCommentRepliesParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIListCommentRepliesSchema,
        },
      },
      description: "Retrieve specific comment with its replies",
    },
  },
});

export default (app: OpenAPIHono) => {
  app.openapi(getCommentsRoute, async (c) => {
    const { appSigner, sort, limit, cursor } = c.req.valid("query");
    const { commentId } = c.req.valid("param");

    // use reverse order to find previous reply
    const previousReplyQuery = cursor
      ? db.query.comment
          .findFirst({
            where: and(
              eq(schema.comment.parentId, commentId),
              appSigner ? eq(schema.comment.appSigner, appSigner) : undefined,
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

    const repliesQuery = db.query.comment.findMany({
      where: and(
        eq(schema.comment.parentId, commentId),
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
      });

    return c.json(formattedComments, 200);
  });

  return app;
};
