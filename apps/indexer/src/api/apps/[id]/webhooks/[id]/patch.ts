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
import { WebhookAuthConfigSchema } from "../../../../../webhooks/schemas";
import { EventNamesSchema } from "../../../../../events/shared/schemas";
import { formatResponseUsingZodSchema } from "../../../../../lib/response-formatters";
import { AppManagerAppNotFoundError } from "../../../../../services/app-manager";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../services/app-webhook-manager";

export const AppWebhookPatchRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

export const AppWebhookPatchRequestBodySchema = z
  .object({
    auth: WebhookAuthConfigSchema,
    eventFilter: z.array(EventNamesSchema),
    name: z.string().trim().nonempty().max(50),
    url: z.string().url(),
  })
  .partial();

export const AppWebhookPatchResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string(),
  url: z.string().url(),
  auth: WebhookAuthConfigSchema,
  eventFilter: z.array(EventNamesSchema),
});

export function setupAppWebhookPatch(app: OpenAPIHono) {
  app.openapi(
    {
      method: "patch",
      path: "/apps/{appId}/webhooks/{webhookId}",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhookPatchRequestParamsSchema,
        body: {
          content: {
            "application/json": {
              schema: AppWebhookPatchRequestBodySchema,
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Webhook updated",
          content: {
            "application/json": {
              schema: AppWebhookPatchResponseSchema,
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
      const patches = c.req.valid("json");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhook } = await appWebhookManager.updateAppWebhook({
          appId: app.id,
          webhookId,
          patches,
        });

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookPatchResponseSchema,
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
