import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas.ts";
import { appManager, siweMiddleware } from "../../../services/index.ts";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters.ts";
import { AppManagerAppNotFoundError } from "../../../services/app-manager-service.ts";

export const AppGetRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppGetResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string().nonempty().max(50),
  secret: z.string().nonempty(),
});

export function setupAppGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{id}",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppGetRequestParamsSchema,
      },
      responses: {
        200: {
          description: "App",
          content: {
            "application/json": {
              schema: AppGetResponseSchema,
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
      const { id } = c.req.valid("param");

      try {
        const { app, signingKey } = await appManager.getApp({
          id,
          ownerId: c.get("user").id,
        });

        return c.json(
          formatResponseUsingZodSchema(AppGetResponseSchema, {
            ...app,
            secret: signingKey.secret,
          }),
          200,
        );
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json({ message: "App not found" }, 404);
        }

        throw error;
      }
    },
  );
}
