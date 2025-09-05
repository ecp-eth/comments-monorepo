import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookManager,
  db,
  siweMiddleware,
} from "../../../../../../../services";
import { AppManagerAppNotFoundError } from "../../../../../../../services/app-manager-service";
import { schema } from "../../../../../../../../schema";
import { sql } from "drizzle-orm";
import { formatResponseUsingZodSchema } from "../../../../../../../lib/response-formatters";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../../services/app-webhook-manager-service";
import { APIErrorResponseSchema } from "../../../../../../../lib/schemas";

export const AppWebhookAnalyticsLatencyResponseGetRequestParamsSchema =
  z.object({
    appId: z.string().uuid(),
    webhookId: z.string().uuid(),
  });

export const AppWebhookAnalyticsLatencyResponseGetRequestQuerySchema = z.object(
  {
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    bucket: z
      .enum(["hour", "day", "week", "month", "year"])
      .default("day")
      .transform((val) => `1 ${val}`),
  },
);

export const AppWebhookAnalyticsLatencyResponseGetResponseSchema = z.object({
  results: z.array(
    z.object({
      bucket: z.string(),
      responseMsPtiles: z.array(z.preprocess(Number, z.number().nonnegative())),
    }),
  ),
});

export function setupGetAppWebhookAnalyticsLatencyResponse(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{appId}/webhooks/{webhookId}/analytics/latency-response",
      middleware: siweMiddleware,
      request: {
        params: AppWebhookAnalyticsLatencyResponseGetRequestParamsSchema,
        query: AppWebhookAnalyticsLatencyResponseGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "Webhook analytics latency response",
          content: {
            "application/json": {
              schema: AppWebhookAnalyticsLatencyResponseGetResponseSchema,
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
          description: "App or webhook not found",
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
      const { from, to, bucket } = c.req.valid("query");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhook } = await appWebhookManager.getAppWebhook({
          appId: app.id,
          webhookId,
        });

        const { rows } = await db.execute<{
          bucket: string;
          responseMsPtiles: string[];
        }>(sql`
          WITH attempts AS (
            SELECT
              date_bin(${bucket}::interval, a.attempted_at, '1970-01-01'::timestamptz) AS bucket,
              a.response_ms
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE 
              a.attempted_at >= ${from} 
              AND a.attempted_at < ${to}
              AND a.app_webhook_id = ${appWebhook.id}
              AND a.response_status BETWEEN 200 AND 399
          )

          SELECT
            bucket,
            PERCENTILE_CONT(ARRAY[0.5,0.9,0.95,0.99]) WITHIN GROUP (ORDER BY a.response_ms) AS "responseMsPtiles"
          FROM attempts a
          GROUP BY 1
          ORDER BY 1;
        `);

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookAnalyticsLatencyResponseGetResponseSchema,
            {
              results: rows,
            },
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
