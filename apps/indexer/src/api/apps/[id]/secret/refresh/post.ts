import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appManager, siweMiddleware } from "../../../../../services/index.ts";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  OpenAPIMaskedAppSecretSchema,
} from "../../../../../lib/schemas.ts";
import {
  AppManagerAppNotFoundError,
  AppManagerFailedToRefreshAppSecretError,
} from "../../../../../services/app-manager-service.ts";
import { formatResponseUsingZodSchema } from "../../../../../lib/response-formatters.ts";

export const AppSecretRefreshRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppSecretRefreshResponseSchema = z.object({
  secret: OpenAPIMaskedAppSecretSchema,
});

export function setupAppSecretRefresh(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/apps/{id}/secret/refresh",
      tags: ["apps", "webhooks"],
      description: "Refresh an app secret",
      middleware: siweMiddleware,
      request: {
        params: AppSecretRefreshRequestParamsSchema,
      },
      responses: {
        200: {
          description: "Secret refreshed successfully",
          content: {
            "application/json": {
              schema: AppSecretRefreshResponseSchema,
            },
          },
        },
        400: {
          content: {
            "application/json": {
              schema: APIBadRequestResponseSchema,
            },
          },
          description: "Bad request",
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
        const { appSecretKey } = await appManager.refreshAppSecret({
          id,
          ownerId: c.get("user").id,
        });

        return c.json(
          formatResponseUsingZodSchema(AppSecretRefreshResponseSchema, {
            secret: appSecretKey.secret,
          }),
          200,
        );
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
