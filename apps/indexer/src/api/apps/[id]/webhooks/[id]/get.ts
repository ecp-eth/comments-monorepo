import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookManager,
  siweMiddleware,
} from "../../../../../services/index.ts";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../../../lib/schemas.ts";
import { formatResponseUsingZodSchema } from "../../../../../lib/response-formatters.ts";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../services/app-webhook-manager-service.ts";
import { AppManagerAppNotFoundError } from "../../../../../services/app-manager-service.ts";
import { WebhookAuthConfigSchema } from "../../../../../webhooks/schemas.ts";
import { EventNamesSchema } from "../../../../../events/schemas.ts";

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
  adminOnly: z
    .object({
      paused: z.boolean(),
      pausedAt: OpenAPIDateStringSchema.nullable(),
    })
    .optional(),
});

export function setupAppWebhookGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{appId}/webhooks/{webhookId}",
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
          formatResponseUsingZodSchema(AppWebhookGetResponseSchema, {
            ...appWebhook,
            adminOnly:
              c.get("user").role === "admin"
                ? {
                    paused: appWebhook.paused,
                    pausedAt: appWebhook.pausedAt,
                  }
                : undefined,
          }),
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
