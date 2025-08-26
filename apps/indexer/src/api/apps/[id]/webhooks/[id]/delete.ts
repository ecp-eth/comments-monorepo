import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookManager,
  siweMiddleware,
} from "../../../../../services";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../../../lib/schemas";
import { EventNamesSchema } from "../../../../../events/shared/schemas";
import { WebhookAuthConfigSchema } from "../../../../../webhooks/schemas";
import { formatResponseUsingZodSchema } from "../../../../../lib/response-formatters";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../services/app-webhook-manager";
import { AppManagerAppNotFoundError } from "../../../../../services/app-manager";

export const AppWebhookDeleteRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

export const AppWebhookDeleteResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string(),
  url: z.string().url(),
  auth: WebhookAuthConfigSchema,
  eventFilter: z.array(EventNamesSchema),
});

export function setupAppWebhookDelete(app: OpenAPIHono) {
  app.openapi(
    {
      method: "delete",
      path: "/apps/{appId}/webhooks/{webhookId}",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhookDeleteRequestParamsSchema,
      },
      responses: {
        200: {
          description: "Webhook deleted",
          content: {
            "application/json": {
              schema: AppWebhookDeleteResponseSchema,
            },
          },
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
          description: "Webhook not found",
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

        const { appWebhook } = await appWebhookManager.deleteAppWebhook({
          appId: app.id,
          webhookId,
        });

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookDeleteResponseSchema,
            appWebhook,
          ),
          200,
        );
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
