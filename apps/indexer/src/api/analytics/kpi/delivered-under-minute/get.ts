import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../../services";
import { OpenAPIFloatFromDbSchema } from "../../../../lib/schemas";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

export const AnalyticsKpiDeliveredUnderMinuteGetQueryParamsSchema = z
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
      description: "Get the delivered under minute live status",
      responses: {
        200: {
          description: "The delivered under minute live status",
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
      const { from, to, appId, webhookId } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);

      const filters: SQL[] = [
        sql`a.attempted_at >= ${fromToUse}::timestamptz`,
        sql`a.attempted_at < ${toToUse}::timestamptz`,
        sql`a.owner_id = ${c.get("user").id}`,
      ];

      if (appId) {
        filters.push(sql`a.app_id = ${appId}`);
      }

      if (webhookId) {
        filters.push(sql`a.app_webhook_id = ${webhookId}`);
      }

      const { rows } = await db.execute<{
        rate: string;
      }>(sql`
        WITH 
          attempts AS (
            SELECT
              a.app_webhook_delivery_id,
              a.event_id,
              a.attempted_at,
              (a.response_status BETWEEN 200 AND 399) AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE 
              ${sql.join(filters, sql` AND `)}
          ),
          success_time AS (
            SELECT
              a.app_webhook_delivery_id,
              e.created_at,
              MIN(a.attempted_at) FILTER (WHERE a.is_success) AS success_at
            FROM attempts a
            JOIN ${schema.eventOutbox} e ON e.id = a.event_id
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
