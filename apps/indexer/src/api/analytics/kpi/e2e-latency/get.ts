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
  p95: z.object({
    firstAttempt: OpenAPIFloatFromDbSchema,
    firstSuccess: OpenAPIFloatFromDbSchema,
  }),
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
      description:
        "Get the p95 end to end latency of first attempt and first success since event creation in ms",
      responses: {
        200: {
          description:
            "The p95 end to end latency of first attempt and first success since event creation in ms",
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

      const filters: SQL[] = [sql`w.owner_id = ${c.get("user").id}`];

      if (appId) {
        filters.push(sql`w.app_id = ${appId}`);
      }

      if (webhookId) {
        filters.push(sql`w.id = ${webhookId}`);
      }

      const { rows } = await db.execute<{
        p95: string;
        p95_success: string;
      }>(sql`
        WITH 
          webhooks AS (
            SELECT w.id
            FROM ${schema.appWebhook} w
            WHERE 
              ${sql.join(filters, sql` AND `)}
          ),
          delivery_stats AS (
            SELECT
              a.app_webhook_delivery_id,
              MIN(a.attempted_at) AS first_attempt,
              MIN(
                CASE WHEN (a.response_status BETWEEN 200 AND 399) THEN a.attempted_at END
              ) as first_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            JOIN ${schema.appWebhookDelivery} d ON (d.id = a.app_webhook_delivery_id AND d.retry_number = 0)
            JOIN webhooks ON (a.app_webhook_id = webhooks.id)
            WHERE 
              a.attempted_at >= ${fromToUse}::timestamptz 
              AND 
              a.attempted_at < ${toToUse}::timestamptz
            GROUP BY 1
          )

          SELECT
            EXTRACT(EPOCH FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ds.first_attempt - e.created_at)) * 1000 AS "p95",
            EXTRACT(EPOCH FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ds.first_success - e.created_at)) * 1000 AS "p95_success"
          FROM ${schema.appWebhookDelivery} d
          JOIN ${schema.eventOutbox} e ON e.id = d.event_id
          JOIN delivery_stats ds ON ds.app_webhook_delivery_id = d.id
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
              p95: {
                firstAttempt: 0,
                firstSuccess: 0,
              },
            },
          ),
          200,
        );
      }

      return c.json(
        formatResponseUsingZodSchema(AnalyticsKpiE2ELatencyGetResponseSchema, {
          p95: {
            firstAttempt: rows[0].p95,
            firstSuccess: rows[0].p95_success,
          },
        }),
        200,
      );
    },
  );
}
