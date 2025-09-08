import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../../services";
import { OpenAPIFloatFromDbSchema } from "../../../../lib/schemas";
import { sql } from "drizzle-orm";
import { schema } from "../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

export const AnalyticsKpiDeliveredUnderMinuteGetQueryParamsSchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from >= data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be before to date",
      });
    }
  });

const AnalyticsKpiDeliveredUnderMinuteGetResponseSchema = z.object({
  rate: OpenAPIFloatFromDbSchema,
});

export function setupAnalyticsKpiDeliveredUnderMinuteGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/kpi/delivered-under-minute",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsKpiDeliveredUnderMinuteGetQueryParamsSchema,
      },
      tags: ["analytics", "kpi", "delivered-under-minute"],
      description: "Get the delivered under minute KPI",
      responses: {
        200: {
          description: "The delivered under minute KPI",
          content: {
            "application/json": {
              schema: AnalyticsKpiDeliveredUnderMinuteGetResponseSchema,
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
      const { from, to } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);

      const { rows } = await db.execute<{
        rate: string;
      }>(sql`
        WITH 
          attempts AS (
            SELECT
              a.*,
              (a.response_status BETWEEN 200 AND 399) AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE 
              a.attempted_at >= ${fromToUse}::timestamptz 
              AND a.attempted_at < ${toToUse}::timestamptz
              AND a.app_webhook_id IN (
                SELECT w.id
                FROM ${schema.appWebhook} w
                JOIN ${schema.app} app ON app.id = w.app_id
                WHERE app.owner_id = ${c.get("user").id}
              )
          ),
          success_time AS (
            SELECT
              d.id,
              e.created_at,
              MIN(a.attempted_at) FILTER (WHERE a.is_success) AS success_at
            FROM ${schema.appWebhookDelivery} d
            JOIN ${schema.eventOutbox} e ON e.id = d.event_id
            JOIN attempts a ON a.app_webhook_delivery_id = d.id
            GROUP BY 1, 2
          )

          SELECT 
            COALESCE(
              (
                COUNT(*) FILTER (WHERE success_at IS NOT NULL AND success_at - created_at <= interval '60 seconds')::float 
                /
                NULLIF(COUNT(*), 0)
              ), 0
            ) as "rate"
          FROM success_time
      `);

      if (!rows[0]) {
        return c.json(
          formatResponseUsingZodSchema(
            AnalyticsKpiDeliveredUnderMinuteGetResponseSchema,
            {
              rate: 0,
            },
          ),
          200,
        );
      }

      return c.json(
        formatResponseUsingZodSchema(
          AnalyticsKpiDeliveredUnderMinuteGetResponseSchema,
          rows[0],
        ),
        200,
      );
    },
  );
}
