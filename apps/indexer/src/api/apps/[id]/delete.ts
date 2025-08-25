import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appManager, siweMiddleware } from "../../../services";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas";
import { AppManagerFailedToDeleteAppError } from "../../../services/app-manager";

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
      path: "/apps/{id}",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppDeleteRequestParamsSchema,
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: AppDeleteResponseSchema,
            },
          },
          description: "App deleted successfully",
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
        const deletedApp = await appManager.deleteApp({
          id,
          ownerId: c.get("user").id,
        });

        return c.json(AppDeleteResponseSchema.parse(deletedApp), 200);
      } catch (e) {
        if (e instanceof AppManagerFailedToDeleteAppError) {
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
