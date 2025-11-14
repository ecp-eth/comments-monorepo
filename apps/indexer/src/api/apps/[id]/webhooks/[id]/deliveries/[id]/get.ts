import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookDeliveryManager,
  siweMiddleware,
} from "../../../../../../../services";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  AppWebhookDeliveryStatusSchema,
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
} from "../../../../../../../lib/schemas";
import { AppManagerAppNotFoundError } from "../../../../../../../services/app-manager-service";
import { AppWebhookDeliveryManagerDeliveryNotFoundError } from "../../../../../../../services/app-webhook-delivery-manager-service";
import { formatResponseUsingZodSchema } from "../../../../../../../lib/response-formatters";
import { AllEventsDbToOpenApiSchema } from "../../../../../../../events/schemas";

export const AppWebhookDeliveryGetRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
  deliveryId: z.coerce.bigint(),
});

export const AppWebhookDeliveryGetResponseSchema = z.object({
  id: OpenAPIBigintStringSchema,
  createdAt: OpenAPIDateStringSchema,
  nextAttemptAt: OpenAPIDateStringSchema.nullable(),
  status: AppWebhookDeliveryStatusSchema,
  attemptsCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  retryNumber: z.number().int().nonnegative(),
  event: z.object({
    payload: AllEventsDbToOpenApiSchema,
  }),
});

export function setupAppWebhookDeliveryGet(app: OpenAPIHono) {
  app.openapi(
    {
      path: "/api/apps/{appId}/webhooks/{webhookId}/deliveries/{deliveryId}",
      method: "get",
      tags: ["apps", "webhooks", "deliveries"],
      description: "Get a delivery by ID",
      middleware: siweMiddleware,
      request: {
        params: AppWebhookDeliveryGetRequestParamsSchema,
      },
      responses: {
        200: {
          description: "Delivery details",
          content: {
            "application/json": {
              schema: AppWebhookDeliveryGetResponseSchema,
            },
          },
        },
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: APIBadRequestResponseSchema,
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
      const { appId, webhookId, deliveryId } = c.req.valid("param");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhookDelivery } =
          await appWebhookDeliveryManager.getAppWebhookDelivery({
            appId: app.id,
            webhookId,
            deliveryId,
          });

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookDeliveryGetResponseSchema,
            appWebhookDelivery,
          ),
          200,
        );
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json({ message: "App not found" }, 404);
        }

        if (error instanceof AppWebhookDeliveryManagerDeliveryNotFoundError) {
          return c.json({ message: "Delivery not found" }, 404);
        }

        throw error;
      }
    },
  );
}
