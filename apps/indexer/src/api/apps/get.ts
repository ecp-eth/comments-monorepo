import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../lib/schemas";
import { appManager, siweMiddleware } from "../../services";
import { formatResponseUsingZodSchema } from "../../lib/response-formatters";

export const AppGetRequestQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const AppSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string().nonempty().max(50),
});

export const AppsGetResponseSchema = z.object({
  results: z.array(AppSchema),
  pageInfo: z.object({
    totalPages: z.number().int().nonnegative(),
  }),
});

export function setupAppsGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/apps",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        query: AppGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "Apps",
          content: {
            "application/json": {
              schema: AppsGetResponseSchema,
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
      const { page, limit } = c.req.valid("query");

      const result = await appManager.listApps({
        page,
        limit,
        ownerId: c.get("user").id,
      });

      return c.json(
        formatResponseUsingZodSchema(AppsGetResponseSchema, {
          results: result.apps,
          pageInfo: result.pageInfo,
        }),
        200,
      );
    },
  );
}
