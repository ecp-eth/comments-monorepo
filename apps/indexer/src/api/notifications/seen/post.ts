import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appKeyMiddleware,
  notificationService,
} from "../../../services/index.ts";
import {
  APIErrorResponseSchema,
  OpenAPIENSNameOrAddressSchema,
} from "../../../lib/schemas.ts";
import { NotificationTypeSchema } from "../../../notifications/schemas/shared.ts";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters.ts";
import {
  NotificationService_InvalidEnsNamesError,
  NotificationService_UsersRequiredError,
} from "../../../services/notification-service.ts";
import { AppKeyAuthServiceError } from "../../../services/app-key-auth-service.ts";

export const NotificationsMarkAsSeenRequestBodySchema = z.object({
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
  users: OpenAPIENSNameOrAddressSchema.or(
    OpenAPIENSNameOrAddressSchema.array().min(1).max(20),
  )
    .transform((value) => {
      return Array.isArray(value) ? value : [value];
    })
    .openapi({
      description:
        "The recipients whose notifications should be marked as seen, must contain at least one user",
    }),
});

export const NotificationsMarkAsSeenResponseSchema = z.object({
  count: z.number().int().nonnegative().openapi({
    description: "The number of notifications marked as seen",
  }),
});

export function setupNotificationsSeenPost(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/notifications/seen",
      description: "Mark notifications as seen",
      middleware: appKeyMiddleware,
      request: {
        body: {
          content: {
            "application/json": {
              schema: NotificationsMarkAsSeenRequestBodySchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: "Successfully marked notifications as seen",
          content: {
            "application/json": {
              schema: NotificationsMarkAsSeenResponseSchema,
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
      const { type, lastSeenNotificationDate, users } = c.req.valid("json");

      try {
        const app = c.get("app");

        const { count } = await notificationService.markNotificationsAsSeen({
          appId: app.id,
          types: type,
          lastSeenNotificationDate,
          users,
        });

        return c.json(
          formatResponseUsingZodSchema(NotificationsMarkAsSeenResponseSchema, {
            count,
          }),
          200,
        );
      } catch (error) {
        if (error instanceof AppKeyAuthServiceError) {
          return c.json({ message: "Invalid app key" }, 401);
        }

        if (error instanceof NotificationService_UsersRequiredError) {
          return c.json({ message: "Users are required" }, 400);
        }

        if (error instanceof NotificationService_InvalidEnsNamesError) {
          return c.json({ message: "Invalid ENS names" }, 400);
        }

        throw error;
      }
    },
  );
}
