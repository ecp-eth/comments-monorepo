import schema from "ponder:schema";
import { eq } from "ponder";
import { IndexerAPICommentWithRepliesOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  GetCommentParamSchema,
  GetCommentQuerySchema,
} from "../../../lib/schemas";
import { formatCommentWithRepliesResponse } from "../formatters";
import { fetchCommentWithReplies } from "../fetchers";

const getCommentRoute = createRoute({
  method: "get",
  path: "/api/comments/{commentId}",
  tags: ["comments"],
  description: "Retrieve a single comment by ID",
  request: {
    params: GetCommentParamSchema,
    query: GetCommentQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPICommentWithRepliesOutputSchema,
        },
      },
      description: "A single comment",
    },
    400: {
      content: {
        "application/json": {
          schema: APIBadRequestResponseSchema,
        },
      },
      description: "Bad request",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "Comment not found",
    },
  },
});

/**
 * Setup Single Comment API
 *
 * @param app - The Hono app instance
 * @returns hono app instance
 */
export const setupGetComment = (app: OpenAPIHono) => {
  app.openapi(getCommentRoute, async (c) => {
    const { commentId } = c.req.valid("param");
    const { viewer, chainId, mode, commentType, isReplyDeleted } =
      c.req.valid("query");

    const comment = await fetchCommentWithReplies(
      eq(schema.comment.id, commentId as `0x${string}`),
      {
        viewer,
        chainId,
        mode,
        commentType,
        isReplyDeleted,
      },
    );

    if (!comment) {
      return c.json({ message: "Comment not found" }, 404);
    }

    const formattedComment = await formatCommentWithRepliesResponse(comment, {
      mode,
      commentType,
      isReplyDeleted,
    });

    return c.json(
      IndexerAPICommentWithRepliesOutputSchema.parse(formattedComment),
      200,
    );
  });

  return app;
};
