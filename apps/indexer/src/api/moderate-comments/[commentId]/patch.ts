import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  ChangeModerationStatusOnCommentParamsSchema,
  ChangeModerationStatusOnCommentBodySchema,
} from "../../../lib/schemas";
import schema from "ponder:schema";
import { eq } from "ponder";
import { authMiddleware } from "../../../middleware/auth";
import { IndexerAPIModerationChangeModerationStatusOnCommentSchema } from "@ecp.eth/sdk/schemas";
import { resolveAuthorDataAndFormatCommentChangeModerationStatusResponse } from "../../../lib/response-formatters";
import {
  getCommentModerationStatus,
  updateCommentModerationStatus,
} from "../../../management/services/moderation";
import { db } from "../../../db";

const changeCommentModerationStatusRoute = createRoute({
  method: "post",
  path: "/api/moderation/{commentId}",
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
          schema: IndexerAPIModerationChangeModerationStatusOnCommentSchema,
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

    const commentModerationStatus = await getCommentModerationStatus(commentId);

    if (!commentModerationStatus) {
      return c.json({ message: "Comment moderation status not found" }, 404);
    }

    const [updatedComment] = await db.transaction(async (tx) => {
      await updateCommentModerationStatus(commentId, moderationStatus);

      return await tx
        .update(schema.comment)
        .set({
          moderationStatus,
          moderationStatusChangedAt: new Date(),
        })
        .where(eq(schema.comment.id, commentId))
        .returning();
    });

    if (!updatedComment) {
      return c.json(
        {
          message: "Comment not found",
        },
        404
      );
    }

    return c.json(
      await resolveAuthorDataAndFormatCommentChangeModerationStatusResponse(
        updatedComment
      ),
      200
    );
  });

  return app;
}
