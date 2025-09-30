import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  notificationService,
  siweMiddleware,
} from "../../../../../services";
import { APIErrorResponseSchema } from "../../../../../lib/schemas";
import { NotificationTypeSchema } from "../../../../../notifications/schemas/shared";
import { formatResponseUsingZodSchema } from "../../../../../lib/response-formatters";
import { AppManagerAppNotFoundError } from "../../../../../services/app-manager-service";

export const AppNotificationsMarkAsSeenRequestParamsSchema = z.object({
  appId: z.string().uuid(),
});

export const AppNotificationsMarkAsSeenRequestBodySchema = z.object({
  type: NotificationTypeSchema.or(NotificationTypeSchema.array())
    .default([])
    .transform((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      return [value];
    })
    .openapi({
      description:
        "The type of notification to mark as seen, if omitted or empty all notifications will be marked as seen",
    }),
  lastSeenNotificationDate: z.coerce.date().optional().openapi({
    description:
      "The date of the last seen notification, only unseen notifications created after this date will be marked as seen. If omitted all notifications will be marked as seen",
  }),
});

export const AppNotificationsMarkAsSeenResponseSchema = z.object({
  count: z.number().int().nonnegative().openapi({
    description: "The number of notifications marked as seen",
  }),
});

export function setupAppNotificationsSeenPost(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/apps/{appId}/notifications/seen",
      description: "Mark notifications as seen",
      middleware: siweMiddleware,
      request: {
        params: AppNotificationsMarkAsSeenRequestParamsSchema,
        body: {
          content: {
            "application/json": {
              schema: AppNotificationsMarkAsSeenRequestBodySchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: "Successfully marked notifications as seen",
          content: {
            "application/json": {
              schema: AppNotificationsMarkAsSeenResponseSchema,
            },
          },
        },
        400: {
          description: "Bad request",
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
      const { appId } = c.req.valid("param");
      const { type, lastSeenNotificationDate } = c.req.valid("json");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { count } = await notificationService.markNotificationsAsSeen({
          appId: app.id,
          types: type,
          lastSeenNotificationDate,
        });

        return c.json(
          formatResponseUsingZodSchema(
            AppNotificationsMarkAsSeenResponseSchema,
            {
              count,
            },
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
