import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../lib/schemas.ts";
import { appManager, siweMiddleware } from "../../services/index.ts";
import { formatResponseUsingZodSchema } from "../../lib/response-formatters.ts";

export const AppCreateRequestSchema = z.object({
  name: z.string().trim().nonempty().max(50),
});

export const AppCreateResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string().nonempty().max(50),
  secret: z.string().nonempty(),
});

export function setupAppCreate(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/apps",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        body: {
          content: {
            "application/json": {
              schema: AppCreateRequestSchema,
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "App created successfully",
          content: {
            "application/json": {
              schema: AppCreateResponseSchema,
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
      const { name } = c.req.valid("json");
      const { app, signingKey } = await appManager.createApp({
        name,
        ownerId: c.get("user").id,
      });

      return c.json(
        formatResponseUsingZodSchema(AppCreateResponseSchema, {
          ...app,
          secret: signingKey.secret,
        }),
        200,
      );
    },
  );
}
