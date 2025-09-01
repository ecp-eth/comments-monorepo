import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../../lib/schemas.ts";
import {
  appManager,
  appWebhookManager,
  siweMiddleware,
} from "../../../../services/index.ts";
import { WebhookAuthConfigSchema } from "../../../../webhooks/schemas.ts";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters.ts";
import { EventNamesSchema } from "../../../../events/schemas.ts";
import { AppManagerAppNotFoundError } from "../../../../services/app-manager-service.ts";

export const AppWebhookCreateRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppWebhookCreateRequestBodySchema = z.object({
  url: z.string().url(),
  events: z.array(EventNamesSchema),
  auth: WebhookAuthConfigSchema,
  name: z.string().trim().nonempty().max(50),
});

export const AppWebhookCreateResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string(),
  url: z.string().url(),
  auth: WebhookAuthConfigSchema,
  eventFilter: z.array(EventNamesSchema),
});

export function setupAppWebhookCreate(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/apps/{id}/webhooks",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhookCreateRequestParamsSchema,
        body: {
          content: {
            "application/json": {
              schema: AppWebhookCreateRequestBodySchema,
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Webhook created",
          content: {
            "application/json": {
              schema: AppWebhookCreateResponseSchema,
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
          description: "App not found",
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
      const { id: appId } = c.req.valid("param");
      const { auth, url, events, name } = c.req.valid("json");

      try {
        const app = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhook } = await appWebhookManager.createAppWebhook({
          app: app.app,
          webhook: {
            url,
            events,
            auth,
            name,
          },
        });

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookCreateResponseSchema,
            appWebhook,
          ),
          200,
        );
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json(
            {
              message: "App not found",
            },
            404,
          );
        }

        throw error;
      }
    },
  );
}
