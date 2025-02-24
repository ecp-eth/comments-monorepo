import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq } from "ponder";
import {
  IndexerAPIListCommentRepliesSchema,
} from "@ecp.eth/sdk/schemas";
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
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
  description: "Return a single comments according to the id and additional criteria",
  request: {
    query: GetCommentRepliesQuerySchema,
    params: GetCommentRepliesParamSchema
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
    const { appSigner, sort, limit, offset } = c.req.valid('query')
    const { commentId } = c.req.valid('param')
  
    const query = db.query.comment.findMany({
      where: and(
        eq(schema.comment.parentId, commentId),
        appSigner ? eq(schema.comment.appSigner, appSigner) : undefined
      ),
      orderBy:
        sort === "desc"
          ? desc(schema.comment.timestamp)
          : asc(schema.comment.timestamp),
      limit: limit + 1,
      offset,
    });
  
    const replies = await query.execute();
  
    const formattedComments = await resolveUserDataAndFormatListCommentsResponse({
      comments: replies,
      limit,
      offset,
      replyLimit: REPLIES_PER_COMMENT,
    });
  
    return c.json(formattedComments, 200);
  });

  return app;
}