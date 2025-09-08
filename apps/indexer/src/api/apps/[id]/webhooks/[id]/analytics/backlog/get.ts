import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
} from "../../../../../../../lib/schemas";
import {
  appManager,
  appWebhookManager,
  db,
  siweMiddleware,
} from "../../../../../../../services";
import { AppManagerAppNotFoundError } from "../../../../../../../services/app-manager-service";
import { formatResponseUsingZodSchema } from "../../../../../../../lib/response-formatters";
import { sql } from "drizzle-orm";
import { schema } from "../../../../../../../../schema";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../../services/app-webhook-manager-service";

export const AppWebhookAnalyticsBacklogGetRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

export const AppWebhookAnalyticsBacklogGetResponseSchema = z.object({
  pendingDeliveries: OpenAPIBigintStringSchema,
  nextDueAt: OpenAPIDateStringSchema.nullable(),
  oldestAge: z.number().nullable(),
});

export function setupGetAppWebhookAnalyticsBacklog(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{appId}/webhooks/{webhookId}/analytics/backlog",
      tags: ["apps", "webhooks", "analytics", "backlog"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhookAnalyticsBacklogGetRequestParamsSchema,
      },
      responses: {
        200: {
          description: "Webhook analytics backlog",
          content: {
            "application/json": {
              schema: AppWebhookAnalyticsBacklogGetResponseSchema,
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
      const { appId, webhookId } = c.req.valid("param");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhook } = await appWebhookManager.getAppWebhook({
          appId: app.id,
          webhookId,
        });

        const {
          rows: [row],
        } = await db.execute<{
          pendingDeliveries: string;
          nextDueAt: Date | null;
          oldestAge: number | null;
        }>(sql`
          SELECT
            COUNT(*) AS "pendingDeliveries",
            MIN(d.next_attempt_at) AS "nextDueAt",
            MAX(d.next_attempt_at) - MIN(d.next_attempt_at) AS "oldestAge"
          FROM ${schema.appWebhookDelivery} d   
          WHERE d.app_webhook_id = ${appWebhook.id}
          AND d.status = 'pending'
        `);

        if (!row) {
          return c.json({ message: "No backlog found" }, 404);
        }

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookAnalyticsBacklogGetResponseSchema,
            row,
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

        throw error;
      }
    },
  );
}
