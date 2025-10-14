import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
  OpenAPIMaskedAppSecretSchema,
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
  secret: OpenAPIMaskedAppSecretSchema,
});

export function setupAppGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{id}",
      tags: ["apps", "webhooks"],
      description: "Get an app",
      middleware: siweMiddleware,
      request: {
        params: AppGetRequestParamsSchema,
      },
      responses: {
        200: {
          description: "App details",
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
        const { app, secretKey } = await appManager.getApp({
          id,
          ownerId: c.get("user").id,
        });

        return c.json(
          formatResponseUsingZodSchema(AppGetResponseSchema, {
            ...app,
            secret: secretKey.secret,
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
