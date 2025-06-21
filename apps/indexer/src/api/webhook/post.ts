import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { APIErrorResponseSchema } from "../../lib/schemas";
import { updateCommentModerationStatus } from "../../management/services/moderation";
import { moderationNotificationsService } from "../../services";
import { HTTPException } from "hono/http-exception";
import { CommentSelectType } from "ponder:schema";
import { MAX_WEBHOOK_REQUEST_AGE_IN_MS } from "../../lib/constants";

const webhookRequestBodySchema = z.object({
  callback_query: z.object({
    data: z.string().nonempty(),
    message: z.object({
      message_id: z.number().int().nonnegative(),
    }),
  }),
});

const webhookRoute = createRoute({
  method: "post",
  path: "/api/webhook",
  description: "Webhook to receive commands",
  request: {
    body: {
      content: {
        "application/json": {
          schema: webhookRequestBodySchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "When webhook request is valid",
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
      description: "When request signature is not valid",
    },
  },
});

export function setupWebhook(app: OpenAPIHono) {
  app.openapi(webhookRoute, async (c) => {
    const { callback_query } = c.req.valid("json");

    const { data, message } = callback_query;

    try {
      const command =
        moderationNotificationsService.decryptWebhookCallbackData(data);

      if (Date.now() - command.timestamp > MAX_WEBHOOK_REQUEST_AGE_IN_MS) {
        throw new HTTPException(400, {
          message: "Webhook request is too old",
        });
      }

      let comment: CommentSelectType | undefined;

      switch (command.action) {
        case "approve":
          comment = await updateCommentModerationStatus(
            command.commentId,
            "approved",
          );
          break;
        case "reject":
          comment = await updateCommentModerationStatus(
            command.commentId,
            "rejected",
          );
          break;
        default:
          throw new HTTPException(400, {
            message: "Invalid action",
          });
      }

      if (!comment) {
        throw new HTTPException(404, {
          message: "Comment not found",
        });
      }

      await moderationNotificationsService.updateMessageWithModerationStatus(
        message.message_id,
        comment,
      );

      return c.newResponse(null, 204);
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }

      throw new HTTPException(400, {
        message: "Invalid webhook data",
      });
    }
  });

  return app;
}
