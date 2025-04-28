import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  ChangeModerationStatusOnCommentParamsSchema,
  ChangeModerationStatusOnCommentBodySchema,
} from "../../../lib/schemas";
import { authMiddleware } from "../../../middleware/auth";
import { IndexerAPIModerationChangeModerationStatusOnCommentOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { resolveAuthorDataAndFormatCommentChangeModerationStatusResponse } from "../../../lib/response-formatters";
import { updateCommentModerationStatus } from "../../../management/services/moderation";

const changeCommentModerationStatusRoute = createRoute({
  method: "patch",
  path: "/api/moderate-comments/{commentId}",
  middleware: [authMiddleware()],
  tags: ["comments"],
  description: "Change the moderation status of a comment",
  request: {
    params: ChangeModerationStatusOnCommentParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: ChangeModerationStatusOnCommentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Comment with moderation status changed",
      content: {
        "application/json": {
          schema:
            IndexerAPIModerationChangeModerationStatusOnCommentOutputSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not valid",
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

export function setupChangeCommentModerationStatus(app: OpenAPIHono) {
  app.openapi(changeCommentModerationStatusRoute, async (c) => {
    const { commentId } = c.req.valid("param");
    const { moderationStatus } = c.req.valid("json");

    const updatedComment = await updateCommentModerationStatus(
      commentId,
      moderationStatus
    );

    if (!updatedComment) {
      return c.json(
        {
          message: "Comment not found",
        },
        404
      );
    }

    return c.json(
      IndexerAPIModerationChangeModerationStatusOnCommentOutputSchema.parse(
        await resolveAuthorDataAndFormatCommentChangeModerationStatusResponse(
          updatedComment
        )
      ),
      200
    );
  });

  return app;
}
