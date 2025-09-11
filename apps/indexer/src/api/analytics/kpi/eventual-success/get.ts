import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../../services";
import { OpenAPIFloatFromDbSchema } from "../../../../lib/schemas";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

export const AnalyticsKpiEventualSuccessGetQueryParamsSchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    appId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from >= data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be before to date",
      });
    }
  });

const AnalyticsKpiEventualSuccessGetResponseSchema = z.object({
  eventualSuccessRate: OpenAPIFloatFromDbSchema,
  previousEventualSuccessRate: OpenAPIFloatFromDbSchema,
  delta: OpenAPIFloatFromDbSchema,
});

export function setupAnalyticsKpiEventualSuccessGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/kpi/eventual-success",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsKpiEventualSuccessGetQueryParamsSchema,
      },
      tags: ["analytics", "kpi", "eventual-success"],
      description: "Get the deliveries KPI",
      responses: {
        200: {
          description: "The eventual success KPI",
          content: {
            "application/json": {
              schema: AnalyticsKpiEventualSuccessGetResponseSchema,
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
      const { from, to, appId } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);

      const filters: SQL[] = [sql`app.owner_id = ${c.get("user").id}`];

      if (appId) {
        filters.push(sql`app.id = ${appId}`);
      }

      const { rows } = await db.execute<{
        eventualSuccessRate: string;
        delta: string;
        previousEventualSuccessRate: string;
      }>(sql`
        WITH 
          filtered_webhooks AS (
            SELECT
              w.id
            FROM ${schema.appWebhook} w
            JOIN ${schema.app} app ON app.id = w.app_id
            WHERE 
              ${sql.join(filters, sql` AND `)}
          ),
          previous_bounds AS (
            SELECT ${fromToUse}::timestamptz - (${toToUse}::timestamptz - ${fromToUse}::timestamptz) AS previous_from, 
            ${fromToUse}::timestamptz AS previous_to
          ), 
          deliveries AS (
            SELECT
              d.status
            FROM ${schema.appWebhookDelivery} d
            JOIN filtered_webhooks ON (d.app_webhook_id = filtered_webhooks.id)
            WHERE
              d.created_at >= ${fromToUse}::timestamptz
              AND d.created_at < ${toToUse}::timestamptz
              AND d.status IN ('success', 'failed')
          ),
          previous_deliveries AS (
            SELECT
              d.status
            FROM ${schema.appWebhookDelivery} d
            JOIN filtered_webhooks ON (d.app_webhook_id = filtered_webhooks.id)
            WHERE
              d.created_at >= (SELECT previous_from FROM previous_bounds) 
              AND d.created_at < (SELECT previous_to FROM previous_bounds)
              AND d.status IN ('success', 'failed')
          ),
          previous_eventual_success_rate AS (
            SELECT
              COALESCE((COUNT(*) FILTER (WHERE status = 'success')::float / NULLIF(COUNT(*), 0)), 0) as "previousEventualSuccessRate"
            FROM previous_deliveries
          ),
          eventual_success_rate AS (
            SELECT
              COALESCE((COUNT(*) FILTER (WHERE status = 'success')::float / NULLIF(COUNT(*), 0)), 0) as "eventualSuccessRate"
            FROM deliveries
          )

          SELECT 
            *, 
            (eventual_success_rate."eventualSuccessRate" - previous_eventual_success_rate."previousEventualSuccessRate") as "delta" 
          FROM previous_eventual_success_rate, eventual_success_rate
      `);

      if (!rows[0]) {
        return c.json(
          formatResponseUsingZodSchema(
            AnalyticsKpiEventualSuccessGetResponseSchema,
            {
              eventualSuccessRate: 0,
              previousEventualSuccessRate: 0,
              delta: 0,
            },
          ),
          200,
        );
      }

      return c.json(
        formatResponseUsingZodSchema(
          AnalyticsKpiEventualSuccessGetResponseSchema,
          rows[0],
        ),
        200,
      );
    },
  );
}
