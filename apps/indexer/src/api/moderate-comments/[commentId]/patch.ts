import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  ChangeModerationStatusOnCommentParamsSchema,
  ChangeModerationStatusOnCommentBodySchema,
} from "../../../lib/schemas";
import {
  authMiddleware,
  type AuthMiddlewareContext,
} from "../../../middleware/auth";
import { IndexerAPIModerationChangeModerationStatusOnCommentOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { resolveAuthorDataAndFormatCommentChangeModerationStatusResponse } from "../../../lib/response-formatters";
import { commentModerationService } from "../../../services";

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
      required: true,
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
  (app as OpenAPIHono<AuthMiddlewareContext>).openapi(
    changeCommentModerationStatusRoute,
    async (c) => {
      const { commentId } = c.req.valid("param");
      const { moderationStatus, revision } = c.req.valid("json");
      const apiKeyId = c.get("apiKeyId");

      const updatedComment =
        await commentModerationService.updateModerationStatus({
          commentId,
          commentRevision: revision,
          callbackQuery: undefined,
          status: moderationStatus,
          updatedBy: `apiKeyId:${apiKeyId}`,
        });

      if (!updatedComment) {
        return c.json(
          {
            message: "Comment not found",
          },
          404,
        );
      }

      return c.json(
        IndexerAPIModerationChangeModerationStatusOnCommentOutputSchema.parse(
          await resolveAuthorDataAndFormatCommentChangeModerationStatusResponse(
            updatedComment,
          ),
        ),
        200,
      );
    },
  );

  return app;
}
