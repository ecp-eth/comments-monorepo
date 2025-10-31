import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appManager, siweMiddleware } from "../../../../../services/index.ts";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
} from "../../../../../lib/schemas.ts";
import {
  AppManagerAppNotFoundError,
  AppManagerFailedToRefreshAppSecretError,
} from "../../../../../services/app-manager-service.ts";
import { formatResponseUsingZodSchema } from "../../../../../lib/response-formatters.ts";

export const AppSecretRevealRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const AppSecretResponseSchema = z.object({
  secret: z.string().nonempty(),
});

export function setupAppSecretReveal(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/apps/{id}/secret/reveal",
      tags: ["apps", "webhooks"],
      description: "Reveal an app secret",
      middleware: siweMiddleware,
      request: {
        params: AppSecretRevealRequestParamsSchema,
      },
      responses: {
        200: {
          description: "Secret revealed successfully",
          content: {
            "application/json": {
              schema: AppSecretResponseSchema,
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
        const { secretKey } = await appManager.getApp({
          id,
          ownerId: c.get("user").id,
        });

        return c.json(
          formatResponseUsingZodSchema(AppSecretResponseSchema, {
            secret: secretKey.secret,
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
