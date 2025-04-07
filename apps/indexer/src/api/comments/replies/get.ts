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
import { env } from "../../../env";

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
    const { appSigner, sort, limit, cursor, viewer } = c.req.valid("query");
    const { commentId } = c.req.valid("param");

    const sharedConditions = [
      eq(schema.comments.parentId, commentId),
      appSigner ? eq(schema.comments.appSigner, appSigner) : undefined,
    ];

    if (env.MODERATION_ENABLED) {
      if (viewer) {
        sharedConditions.push(
          or(
            eq(schema.comments.moderationStatus, "approved"),
            eq(schema.comments.author, viewer)
          )
        );
      } else {
        sharedConditions.push(eq(schema.comments.moderationStatus, "approved"));
      }
    }

    // use reverse order to find previous reply
    const previousReplyQuery = cursor
      ? db.query.comments
          .findFirst({
            where: and(
              ...sharedConditions,
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

    const repliesQuery = db.query.comments.findMany({
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
