import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../../services";
import { OpenAPIFloatFromDbSchema } from "../../../../lib/schemas";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

export const AnalyticsKpiFirstAttemptSuccessGetQueryParamsSchema = z
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

const AnalyticsKpiFirstAttemptSuccessGetResponseSchema = z.object({
  firstSuccessRate: OpenAPIFloatFromDbSchema,
  previousFirstSuccessRate: OpenAPIFloatFromDbSchema,
  delta: OpenAPIFloatFromDbSchema,
});

export function setupAnalyticsKpiFirstAttemptSuccessGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/kpi/first-attempt-success",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsKpiFirstAttemptSuccessGetQueryParamsSchema,
      },
      tags: ["analytics", "kpi", "first-attempt-success"],
      description: "Get the deliveries KPI",
      responses: {
        200: {
          description: "The first attempt success KPI",
          content: {
            "application/json": {
              schema: AnalyticsKpiFirstAttemptSuccessGetResponseSchema,
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
        firstSuccessRate: string;
        delta: string;
        previousFirstSuccessRate: string;
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
          attempts AS (
            SELECT
              a.*,
              (a.response_status BETWEEN 200 AND 399) AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            JOIN filtered_webhooks ON (a.app_webhook_id = filtered_webhooks.id)
            WHERE 
              a.attempted_at >= ${fromToUse}::timestamptz 
              AND a.attempted_at < ${toToUse}::timestamptz
          ),
          first_attempts AS (
            SELECT
              app_webhook_delivery_id,
              MIN(attempt_number) FILTER (WHERE is_success) AS first_success_attempt
            FROM attempts
            GROUP BY 1
          ),
          previous_attempts AS (
            SELECT
              a.*,
              (a.response_status BETWEEN 200 AND 399) AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            JOIN filtered_webhooks ON (a.app_webhook_id = filtered_webhooks.id)
            WHERE 
              a.attempted_at >= (SELECT previous_from FROM previous_bounds) 
              AND a.attempted_at < (SELECT previous_to FROM previous_bounds)
          ),
          previous_first_attempts AS (
            SELECT
              app_webhook_delivery_id,
              MIN(attempt_number) FILTER (WHERE is_success) AS first_success_attempt
            FROM previous_attempts
            GROUP BY 1
          ),
          previous_first_success_rate AS (
            SELECT
              COALESCE(AVG(CASE WHEN first_success_attempt = 1 THEN 1 ELSE 0 END), 0) as "previousFirstSuccessRate"
            FROM previous_first_attempts
          ),
          first_success_rate AS (
            SELECT
              COALESCE(AVG(CASE WHEN first_success_attempt = 1 THEN 1 ELSE 0 END), 0) as "firstSuccessRate"
            FROM first_attempts
          )

          SELECT 
            *, 
            (first_success_rate."firstSuccessRate" - previous_first_success_rate."previousFirstSuccessRate") as "delta" 
          FROM previous_first_success_rate, first_success_rate
      `);

      if (!rows[0]) {
        return c.json(
          formatResponseUsingZodSchema(
            AnalyticsKpiFirstAttemptSuccessGetResponseSchema,
            {
              firstSuccessRate: 0,
              previousFirstSuccessRate: 0,
              delta: 0,
            },
          ),
          200,
        );
      }

      return c.json(
        formatResponseUsingZodSchema(
          AnalyticsKpiFirstAttemptSuccessGetResponseSchema,
          rows[0],
        ),
        200,
      );
    },
  );
}
