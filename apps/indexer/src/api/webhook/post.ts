import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { APIErrorResponseSchema } from "../../lib/schemas";
import * as Sentry from "@sentry/node";

import {
  commentReportsService,
  telegramNotificationsService,
} from "../../services";
import { HTTPException } from "hono/http-exception";
import { MAX_WEBHOOK_REQUEST_AGE_IN_MS } from "../../lib/constants";
import { commentModerationService } from "../../services";

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
        telegramNotificationsService.decryptWebhookCallbackData(data);

      if (Date.now() - command.timestamp > MAX_WEBHOOK_REQUEST_AGE_IN_MS) {
        Sentry.captureMessage("Webhook request is too old.", {
          level: "warning",
          extra: {
            command,
          },
        });

        return c.newResponse(null, 204);
      }

      switch (command.action) {
        case "moderation-set-as-approved":
          await commentModerationService.updateModerationStatus({
            commentId: command.commentId,
            messageId: message.message_id,
            status: "approved",
          });

          break;
        case "moderation-set-as-rejected":
          await commentModerationService.updateModerationStatus({
            commentId: command.commentId,
            messageId: message.message_id,
            status: "rejected",
          });

          break;
        case "moderation-set-as-pending":
          await commentModerationService.updateModerationStatus({
            commentId: command.commentId,
            messageId: message.message_id,
            status: "pending",
          });

          break;
        case "moderation-change-status":
          await commentModerationService.requestStatusChange(
            message.message_id,
            command.commentId,
          );

          break;
        case "moderation-cancel":
          await commentModerationService.cancelStatusChange(
            message.message_id,
            command.commentId,
          );

          return c.newResponse(null, 204);
        case "report-set-as-resolved": {
          await commentReportsService.changeStatus(
            message.message_id,
            command.reportId,
            "resolved",
          );

          break;
        }
        case "report-set-as-closed": {
          await commentReportsService.changeStatus(
            message.message_id,
            command.reportId,
            "closed",
          );

          break;
        }
        case "report-set-as-pending": {
          await commentReportsService.changeStatus(
            message.message_id,
            command.reportId,
            "pending",
          );

          break;
        }
        case "report-change-status": {
          await commentReportsService.requestStatusChange(
            message.message_id,
            command.reportId,
          );

          break;
        }
        case "report-cancel": {
          await commentReportsService.cancelStatusChange(
            message.message_id,
            command.reportId,
          );

          break;
        }
        default:
          command satisfies never;

          Sentry.captureMessage("Invalid action", {
            level: "warning",
            extra: {
              command,
            },
          });
      }

      return c.newResponse(null, 204);
    } catch (error) {
      console.error("Telegram webhook error", error);

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
