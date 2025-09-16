import { z, type OpenAPIHono } from "@hono/zod-openapi";

import {
  appManager,
  appWebhookManager,
  eventOutboxService,
  siweMiddleware,
} from "../../../../../../services/index.ts";
import { APIErrorResponseSchema } from "../../../../../../lib/schemas.ts";
import { AppManagerAppNotFoundError } from "../../../../../../services/app-manager-service.ts";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../services/app-webhook-manager-service.ts";
import { createTestEvent } from "../../../../../../events/test/index.ts";

export const AppWebhookTestRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

export function setupAppWebhookTest(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/apps/{appId}/webhooks/{webhookId}/test",
      tags: ["apps", "webhooks"],
      description: "Test a webhook",
      middleware: siweMiddleware,
      request: {
        params: AppWebhookTestRequestParamsSchema,
      },
      responses: {
        204: {
          description: "Webhook test event queued successfully",
        },
        400: {
          description: "Invalid request",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
        401: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
        404: {
          description: "Webhook or app not found",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
      },
    },
    async (c) => {
      const { appId, webhookId } = c.req.valid("param");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhook } = await appWebhookManager.getAppWebhook({
          webhookId,
          appId: app.id,
        });

        await eventOutboxService.publishEvent({
          event: createTestEvent({
            appId: app.id,
            webhookId: appWebhook.id,
          }),
          aggregateId: appWebhook.id,
          aggregateType: "app-webhook",
        });

        return c.newResponse(null, 204);
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json({ message: "App not found" }, 404);
        }

        if (error instanceof AppWebhookManagerAppWebhookNotFoundError) {
          return c.json({ message: "Webhook not found" }, 404);
        }

        throw error;
      }
    },
  );
}
