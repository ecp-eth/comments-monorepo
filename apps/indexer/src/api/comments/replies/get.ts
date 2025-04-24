import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, lt, or, isNull } from "ponder";
import { IndexerAPIListCommentRepliesSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { resolveUserDataAndFormatListCommentsResponse } from "../../../lib/response-formatters";
import {
  GetCommentRepliesQuerySchema,
  GetCommentRepliesParamSchema,
  APIErrorResponseSchema,
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
      appSigner,
      sort,
      limit,
      cursor,
      mode,
      viewer,
      channelId,
      commentType,
    } = c.req.valid("query");
    const { commentId } = c.req.valid("param");

    const sharedConditions = [
      appSigner ? eq(schema.comments.appSigner, appSigner) : undefined,
      channelId != null ? eq(schema.comments.channelId, channelId) : undefined,
      commentType ? eq(schema.comments.commentType, commentType) : undefined,
    ];

    if (mode === "flat") {
      const rootComment = await db.query.comments.findFirst({
        where: and(
          eq(schema.comments.id, commentId),
          isNull(schema.comments.rootCommentId)
        ),
      });

      if (!rootComment) {
        return c.json(
          {
            message: "Flat mode is not supported for non-root comments",
          },
          400
        );
      }

      sharedConditions.push(eq(schema.comments.rootCommentId, rootComment.id));
    } else {
      sharedConditions.push(eq(schema.comments.parentId, commentId));
    }

    if (env.MODERATION_ENABLED) {
      const onlyApproved = eq(schema.comments.moderationStatus, "approved");

      if (viewer) {
        sharedConditions.push(
          or(onlyApproved, eq(schema.comments.author, viewer))
        );
      } else {
        sharedConditions.push(onlyApproved);
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

    return c.json(
      IndexerAPIListCommentRepliesSchema.parse(formattedComments),
      200
    );
  });

  return app;
};
