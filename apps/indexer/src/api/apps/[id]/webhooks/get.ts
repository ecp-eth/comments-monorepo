import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookManager,
  siweMiddleware,
} from "../../../../services/index.ts";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../../lib/schemas.ts";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters.ts";
import { WebhookAuthConfigSchema } from "../../../../webhooks/schemas.ts";
import { EventNamesSchema } from "../../../../events/schemas.ts";
import { AppManagerAppNotFoundError } from "../../../../services/app-manager-service.ts";

export const AppWebhooksGetRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppWebhooksGetRequestQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const AppWebhooksGetResponseSchema = z.object({
  results: z.array(
    z.object({
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
    }),
  ),
  pageInfo: z.object({
    total: z.number().int().nonnegative(),
  }),
});

export function setupAppWebhooksGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{id}/webhooks",
      tags: ["apps", "webhooks"],
      description: "Get a list of webhooks for an app",
      middleware: siweMiddleware,
      request: {
        params: AppWebhooksGetRequestParamsSchema,
        query: AppWebhooksGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "Paginated list of webhooks",
          content: {
            "application/json": {
              schema: AppWebhooksGetResponseSchema,
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
      const { page, limit } = c.req.valid("query");

      try {
        const app = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhooks, pageInfo } =
          await appWebhookManager.listAppWebhooks({
            app: app.app,
            page,
            limit,
          });

        return c.json(
          formatResponseUsingZodSchema(AppWebhooksGetResponseSchema, {
            results: appWebhooks.map((appWebhook) => ({
              ...appWebhook,
              adminOnly:
                c.get("user").role === "admin"
                  ? {
                      paused: appWebhook.paused,
                      pausedAt: appWebhook.pausedAt,
                    }
                  : undefined,
            })),
            pageInfo,
          }),
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
