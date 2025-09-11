import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../../services";
import { OpenAPIFloatFromDbSchema } from "../../../../lib/schemas";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

export const AnalyticsKpiE2ELatencyGetQueryParamsSchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    appId: z.string().uuid().optional(),
    webhookId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from >= data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be before to date",
      });
    }
  });

const AnalyticsKpiE2ELatencyGetResponseSchema = z.object({
  p95: OpenAPIFloatFromDbSchema,
});

export function setupAnalyticsKpiE2ELatencyGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/kpi/e2e-latency",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsKpiE2ELatencyGetQueryParamsSchema,
      },
      tags: ["analytics", "kpi", "e2e-latency"],
      description: "Get the e2e latency KPI",
      responses: {
        200: {
          description: "The e2e latency KPI",
          content: {
            "application/json": {
              schema: AnalyticsKpiE2ELatencyGetResponseSchema,
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
      const { from, to, appId, webhookId } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);

      const filters: SQL[] = [sql`app.owner_id = ${c.get("user").id}`];

      if (appId) {
        filters.push(sql`app.id = ${appId}`);
      }

      if (webhookId) {
        filters.push(sql`w.id = ${webhookId}`);
      }

      const { rows } = await db.execute<{
        p95: string;
      }>(sql`
        WITH 
          webhooks AS (
            SELECT w.id
            FROM ${schema.appWebhook} w
            JOIN ${schema.app} app ON app.id = w.app_id
            WHERE 
              ${sql.join(filters, sql` AND `)}
          ),
          attempts AS (
            SELECT
              a.*,
              (a.response_status BETWEEN 200 AND 399) AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            JOIN webhooks ON a.app_webhook_id = webhooks.id
            WHERE a.attempted_at >= ${fromToUse}::timestamptz AND a.attempted_at < ${toToUse}::timestamptz
          ),
          first_attempts AS (
            SELECT 
              app_webhook_delivery_id,
              MIN(attempted_at) AS attempted_at
            FROM attempts
            GROUP BY 1
          ),
          successful_attempts AS (
            SELECT
              app_webhook_delivery_id,
              MIN(attempted_at) AS attempted_at
            FROM attempts
            WHERE is_success
            GROUP BY 1
          )

          SELECT
            EXTRACT(EPOCH FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fa.attempted_at - e.created_at)) * 1000 AS "p95"
          FROM ${schema.appWebhookDelivery} d
          JOIN ${schema.eventOutbox} e ON e.id = d.event_id
          JOIN first_attempts fa ON fa.app_webhook_delivery_id = d.id
          JOIN successful_attempts sa ON sa.app_webhook_delivery_id = d.id
          WHERE
            d.created_at >= ${fromToUse}::timestamptz 
            AND d.created_at < ${toToUse}::timestamptz
            AND d.app_webhook_id IN (SELECT id FROM webhooks)
      `);

      if (!rows[0]) {
        return c.json(
          formatResponseUsingZodSchema(
            AnalyticsKpiE2ELatencyGetResponseSchema,
            {
              p95: 0,
            },
          ),
          200,
        );
      }

      return c.json(
        formatResponseUsingZodSchema(
          AnalyticsKpiE2ELatencyGetResponseSchema,
          rows[0],
        ),
        200,
      );
    },
  );
}
