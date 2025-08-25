import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../lib/schemas";
import { appManager, siweMiddleware } from "../../services";

export const AppCreateRequestSchema = z.object({
  name: z.string().nonempty().max(50),
});

export const AppCreateResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  name: z.string().nonempty().max(50),
});

export function setupAppCreate(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/apps",
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
      const app = await appManager.createApp({
        name,
        ownerId: c.get("user").id,
      });

      return c.json(AppCreateResponseSchema.parse(app), 200);
    },
  );
}
