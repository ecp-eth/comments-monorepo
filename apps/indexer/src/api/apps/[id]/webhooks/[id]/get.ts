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
import { formatResponseUsingZodSchema } from "../../../../../lib/response-formatters";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../services/app-webhook-manager";
import { AppManagerAppNotFoundError } from "../../../../../services/app-manager";
import { WebhookAuthConfigSchema } from "../../../../../webhooks/schemas";
import { EventNamesSchema } from "../../../../../events/shared/schemas";

export const AppWebhookGetRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

export const AppWebhookGetResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string(),
  url: z.string().url(),
  auth: WebhookAuthConfigSchema,
  eventFilter: z.array(EventNamesSchema),
});

export function setupAppWebhookGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/apps/{appId}/webhooks/{webhookId}",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhookGetRequestParamsSchema,
      },
      responses: {
        200: {
          description: "Webhook",
          content: {
            "application/json": {
              schema: AppWebhookGetResponseSchema,
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

        const { appWebhook } = await appWebhookManager.getAppWebhook({
          appId: app.id,
          webhookId,
        });

        return c.json(
          formatResponseUsingZodSchema(AppWebhookGetResponseSchema, appWebhook),
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
