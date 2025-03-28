import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  ChangeModerationStatusOnCommentParamsSchema,
} from "../../../lib/schemas";
import schema from "ponder:schema";
import { eq } from "ponder";
import { authMiddleware } from "../../../middleware/auth";
import { IndexerAPIModerationChangeModerationStatusOnCommentSchema } from "@ecp.eth/sdk/schemas";
import { resolveAuthorDataAndFormatCommentChangeModerationStatusResponse } from "../../../lib/response-formatters";
import { db } from "../../../db";

const getCommentRoute = createRoute({
  method: "get",
  path: "/api/moderate-comments/{commentId}",
  middleware: [authMiddleware()],
  tags: ["comments"],
  description: "Get a comment by ID with its moderation status",
  request: {
    params: ChangeModerationStatusOnCommentParamsSchema,
  },
  responses: {
    200: {
      description: "Comment found",
      content: {
        "application/json": {
          schema: IndexerAPIModerationChangeModerationStatusOnCommentSchema,
        },
      },
    },
    401: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When user is not authenticated",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When comment is not found",
    },
  },
});

export function setupGetComment(app: OpenAPIHono) {
  app.openapi(getCommentRoute, async (c) => {
    const { commentId } = c.req.valid("param");

    const comment = await db.query.comment.findFirst({
      where: eq(schema.comment.id, commentId),
    });

    if (!comment) {
      return c.json(
        {
          message: "Comment not found",
        },
        404
      );
    }

    return c.json(
      await resolveAuthorDataAndFormatCommentChangeModerationStatusResponse(
        comment
      ),
      200
    );
  });

  return app;
}
