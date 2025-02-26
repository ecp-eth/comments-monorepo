import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, isNull } from "ponder";
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
    const { targetUri, appSigner, sort, limit, offset } = c.req.valid('query')
    const query = db.query.comment.findMany({
      with: {
        replies: {
          orderBy: desc(schema.comment.timestamp),
          limit: REPLIES_PER_COMMENT + 1,
        },
      },
      where: and(
        isNull(schema.comment.parentId),
        targetUri ? eq(schema.comment.targetUri, targetUri) : undefined,
        appSigner
          ? eq(schema.comment.appSigner, appSigner as `0x${string}`)
          : undefined
      ),
      orderBy:
        sort === "desc"
          ? desc(schema.comment.timestamp)
          : asc(schema.comment.timestamp),
      limit: limit + 1,
      offset,
    });

    const comments = await query.execute();

    const formattedComments =
      await resolveUserDataAndFormatListCommentsResponse({
        comments,
        limit,
        offset,
        replyLimit: REPLIES_PER_COMMENT,
      });

    return c.json(formattedComments, 200);
  });

  return app;
};
