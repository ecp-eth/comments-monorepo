import { z, type OpenAPIHono } from "@hono/zod-openapi";

import {
  appManager,
  eventOutboxService,
  siweMiddleware,
} from "../../../../../../services";
import { APIErrorResponseSchema } from "../../../../../../lib/schemas";
import { AppManagerAppNotFoundError } from "../../../../../../services/app-manager";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../services/app-webhook-manager";

export const AppWebhookTestRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

export function setupAppWebhookTest(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/apps/{appId}/webhooks/{webhookId}/test",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhookTestRequestParamsSchema,
      },
      responses: {
        204: {
          description: "Webhook test event queued",
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
          description: "Not found",
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

        await eventOutboxService.publishTestEvent({
          appId: app.id,
          webhookId,
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
