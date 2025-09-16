import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appManager, siweMiddleware } from "../../../services/index.ts";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas.ts";
import { AppManagerAppNotFoundError } from "../../../services/app-manager-service.ts";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters.ts";

export const AppDeleteRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppDeleteResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string().nonempty().max(50),
});

export function setupAppDelete(app: OpenAPIHono) {
  app.openapi(
    {
      method: "delete",
      path: "/api/apps/{id}",
      tags: ["apps", "webhooks"],
      description: "Delete an app",
      middleware: siweMiddleware,
      request: {
        params: AppDeleteRequestParamsSchema,
      },
      responses: {
        200: {
          description: "App deleted successfully",
          content: {
            "application/json": {
              schema: AppDeleteResponseSchema,
            },
          },
        },
        401: {
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
          description: "Unauthorized",
        },
        404: {
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
          description: "App not found",
        },
        500: {
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
          description: "Internal server error",
        },
      },
    },
    async (c) => {
      try {
        const { id } = c.req.valid("param");
        const { app } = await appManager.deleteApp({
          id,
          ownerId: c.get("user").id,
        });

        return c.json(
          formatResponseUsingZodSchema(AppDeleteResponseSchema, app),
          200,
        );
      } catch (e) {
        if (e instanceof AppManagerAppNotFoundError) {
          return c.json(
            {
              message: "App not found",
            },
            404,
          );
        }

        throw e;
      }
    },
  );
}
