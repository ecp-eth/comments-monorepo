import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookManager,
  db,
  siweMiddleware,
} from "../../../../../../../services";
import { AppManagerAppNotFoundError } from "../../../../../../../services/app-manager-service";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../../services/app-webhook-manager-service";
import { sql } from "drizzle-orm";
import { schema } from "../../../../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../../../../lib/schemas";

export const AppWebhookAnalyticsVolumeGetRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

export const AppWebhookAnalyticsVolumeGetRequestQuerySchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    tz: z.string().default("UTC"),
    bucket: z
      .enum(["hour", "day", "week", "month", "year"])
      .default("day")
      .transform((val) => `1 ${val}`),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from >= data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be before to date",
      });
    }
  });

export const AppWebhookAnalyticsVolumeGetResponseSchema = z.object({
  results: z.array(
    z.object({
      bucket: z.string(),
      // use preprocess instead of coerce because z.input is not able to infer the input type for coerce
      attempts: z.preprocess(Number, z.number().int().nonnegative()),
      successes: z.preprocess(Number, z.number().int().nonnegative()),
      failures: z.preprocess(Number, z.number().int().nonnegative()),
      transport: z.preprocess(Number, z.number().int().nonnegative()),
      http4xx: z.preprocess(Number, z.number().int().nonnegative()),
      http5xx: z.preprocess(Number, z.number().int().nonnegative()),
    }),
  ),
});

export function setupAppWebhookAnalyticsVolumeGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{appId}/webhooks/{webhookId}/analytics/volume",
      tags: ["apps", "webhooks", "analytics", "volume"],
      middleware: siweMiddleware,
      request: {
        params: AppWebhookAnalyticsVolumeGetRequestParamsSchema,
        query: AppWebhookAnalyticsVolumeGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "Webhook analytics volume",
          content: {
            "application/json": {
              schema: AppWebhookAnalyticsVolumeGetResponseSchema,
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
      const toDefault = new Date();
      const fromDefault = new Date(
        toDefault.getTime() - 1000 * 60 * 60 * 24 * 30,
      );
      const { appId, webhookId } = c.req.valid("param");
      const {
        from = fromDefault,
        to = toDefault,
        tz,
        bucket,
      } = c.req.valid("query");

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
          attempts: string;
          successes: string;
          failures: string;
          transport: string;
          http4xx: string;
          http5xx: string;
        }>(sql`
          WITH attempts AS (
            SELECT
              a.id,
              a.attempted_at AT TIME ZONE COALESCE(${tz}, 'UTC') AS attempted_at_tz,
              date_bin(${bucket}::interval, a.attempted_at, '1970-01-01'::timestamptz) AS bucket,
              a.app_webhook_id,
              a.app_webhook_delivery_id,
              a.attempt_number,
              a.response_status,
              a.response_ms,
              (a.response_status BETWEEN 200 AND 399) AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE a.attempted_at >= ${from} AND a.attempted_at < ${to}
              AND a.app_webhook_id = ${appWebhook.id}
          )

          SELECT
            bucket,
            COUNT(*) AS attempts,
            SUM((is_success)::int) AS successes,
            SUM((NOT is_success)::int) AS failures,
            COUNT(*) FILTER (WHERE (a.response_status <= 0)) AS transport,
            COUNT(*) FILTER (WHERE a.response_status BETWEEN 400 AND 499) AS http4xx,
            COUNT(*) FILTER (WHERE a.response_status BETWEEN 500 AND 599) AS http5xx
          FROM attempts a
          GROUP BY 1
          ORDER BY 1;
        `);

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookAnalyticsVolumeGetResponseSchema,
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
