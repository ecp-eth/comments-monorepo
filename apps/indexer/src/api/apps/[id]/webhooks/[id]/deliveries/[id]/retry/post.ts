import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookDeliveryManager,
  appWebhookManager,
  siweMiddleware,
} from "../../../../../../../../services";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
} from "../../../../../../../../lib/schemas";
import { AppManagerAppNotFoundError } from "../../../../../../../../services/app-manager-service";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../../../services/app-webhook-manager-service";
import { formatResponseUsingZodSchema } from "../../../../../../../../lib/response-formatters";
import { AppWebhookDeliveryManagerDeliveryNotFoundError } from "../../../../../../../../services/app-webhook-delivery-manager-service";

export const AppWebhookDeliveryRetryRequestParamsSchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  deliveryId: z.coerce.bigint(),
});

export const AppWebhookDeliveryRetryResponseSchema = z.object({
  id: OpenAPIBigintStringSchema,
  createdAt: OpenAPIDateStringSchema,
  nextAttemptAt: OpenAPIDateStringSchema,
  status: z.enum(["pending", "processing", "success", "failed"]),
  attemptsCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  retryNumber: z.number().int().nonnegative(),
});

export function setupAppWebhookDeliveryRetry(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/apps/{id}/webhooks/{webhookId}/deliveries/{deliveryId}/retry",
      tags: ["apps", "webhooks", "deliveries"],
      description: "Retry a delivery",
      middleware: siweMiddleware,
      request: {
        params: AppWebhookDeliveryRetryRequestParamsSchema,
      },
      responses: {
        200: {
          description: "New delivery to be retried has been queued",
          content: {
            "application/json": {
              schema: AppWebhookDeliveryRetryResponseSchema,
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
          description: "Not found",
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
      const { id, webhookId, deliveryId } = c.req.valid("param");

      try {
        const { app } = await appManager.getApp({
          id,
          ownerId: c.get("user").id,
        });
        const { appWebhook } = await appWebhookManager.getAppWebhook({
          appId: app.id,
          webhookId,
        });
        const { appWebhookDelivery } =
          await appWebhookDeliveryManager.retryDelivery({
            appId: app.id,
            webhookId: appWebhook.id,
            deliveryId,
          });

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookDeliveryRetryResponseSchema,
            appWebhookDelivery,
          ),
          200,
        );
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json({ message: "App not found" }, 404);
        }

        if (error instanceof AppWebhookManagerAppWebhookNotFoundError) {
          return c.json({ message: "Webhook not found" }, 404);
        }

        if (error instanceof AppWebhookDeliveryManagerDeliveryNotFoundError) {
          return c.json({ message: "Delivery not found" }, 404);
        }

        throw error;
      }
    },
  );
}
