import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appWebhookManager, siweMiddleware } from "../../../../services";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../../lib/schemas";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { AppWebhookManagerAppNotFoundError } from "../../../../services/app-webhook-manager";

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
    }),
  ),
  pageInfo: z.object({
    totalPages: z.number().int().nonnegative(),
  }),
});

export function setupAppWebhooksGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/apps/{id}/webhooks",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhooksGetRequestParamsSchema,
        query: AppWebhooksGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "Webhooks",
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
        const { appWebhooks, pageInfo } =
          await appWebhookManager.listAppWebhooks({
            appId,
            ownerId: c.get("user").id,
            page,
            limit,
          });

        return c.json(
          formatResponseUsingZodSchema(AppWebhooksGetResponseSchema, {
            results: appWebhooks,
            pageInfo,
          }),
          200,
        );
      } catch (error) {
        if (error instanceof AppWebhookManagerAppNotFoundError) {
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
