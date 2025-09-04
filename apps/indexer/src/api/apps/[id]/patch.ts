import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas.ts";
import { appManager, siweMiddleware } from "../../../services/index.ts";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters.ts";
import { AppManagerAppNotFoundError } from "../../../services/app-manager-service.ts";

export const AppUpdateRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppUpdateRequestBodySchema = z.object({
  name: z.string().trim().nonempty().max(50),
});

export type AppUpdateRequestBodySchemaType = z.infer<
  typeof AppUpdateRequestBodySchema
>;

export const AppUpdateResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string().nonempty().max(50),
});

export function setupAppUpdate(app: OpenAPIHono) {
  app.openapi(
    {
      method: "patch",
      path: "/api/apps/{id}",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppUpdateRequestParamsSchema,
        body: {
          content: {
            "application/json": {
              schema: AppUpdateRequestBodySchema,
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "App updated",
          content: {
            "application/json": {
              schema: AppUpdateResponseSchema,
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
      },
    },
    async (c) => {
      const { id } = c.req.valid("param");
      const { name } = c.req.valid("json");

      try {
        const { app } = await appManager.getApp({
          id,
          ownerId: c.get("user").id,
        });

        const updateResult = await appManager.updateApp({
          id: app.id,
          name,
        });

        return c.json(
          formatResponseUsingZodSchema(
            AppUpdateResponseSchema,
            updateResult.app,
          ),
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
