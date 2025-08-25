import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appManager, siweMiddleware } from "../../../../../services";
import { APIErrorResponseSchema } from "../../../../../lib/schemas";
import {
  AppManagerAppNotFoundError,
  AppManagerFailedToRefreshAppSecretError,
} from "../../../../../services/app-manager";

export const AppSecretRefreshRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppSecretRefreshResponseSchema = z.object({
  secret: z.string().nonempty(),
});

export function setupAppSecretRefresh(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/apps/{id}/secret/refresh",
      tags: ["apps", "webhooks"],
      middleware: siweMiddleware,
      request: {
        params: AppSecretRefreshRequestParamsSchema,
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: AppSecretRefreshResponseSchema,
            },
          },
          description: "Secret refreshed successfully",
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
      const { id } = c.req.valid("param");

      try {
        const { appSigningKey } = await appManager.refreshAppSecret({
          id,
          ownerId: c.get("user").id,
        });

        return c.json(AppSecretRefreshResponseSchema.parse(appSigningKey), 200);
      } catch (e) {
        if (
          e instanceof AppManagerAppNotFoundError ||
          e instanceof AppManagerFailedToRefreshAppSecretError
        ) {
          return c.json({ message: "App not found" }, 404);
        }

        throw e;
      }
    },
  );
}
