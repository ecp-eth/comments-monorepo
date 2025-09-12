import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
  OpenAPIFloatFromDbSchema,
} from "../../../lib/schemas";
import { db, siweMiddleware } from "../../../services";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../schema";

export const AnalyticsSuccessRatesGetQueryParamsSchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    bucket: z.enum(["hour", "day", "week", "month"]).default("day"),
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

export const AnalyticsSuccessRatesGetResponseSchema = z.object({
  results: z.array(
    z.object({
      time: OpenAPIDateStringSchema,
      eventualSuccessRate: OpenAPIFloatFromDbSchema,
      firstSuccessRate: OpenAPIFloatFromDbSchema,
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: OpenAPIDateStringSchema,
    to: OpenAPIDateStringSchema,
  }),
});

export function setupAnalyticsSuccessRatesGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/success-rates",
      tags: ["analytics", "volume"],
      description: "Get the analytics success rates",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsSuccessRatesGetQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics success rates",
          content: {
            "application/json": {
              schema: AnalyticsSuccessRatesGetResponseSchema,
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
      const { from, to, bucket, appId, webhookId } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);
      const bucketToUse = `1 ${bucket}`;

      const filters: SQL[] = [
        sql`a.owner_id = ${c.get("user").id}`,
        sql`a.attempted_at >= ${fromToUse}::timestamptz`,
        sql`a.attempted_at < ${toToUse}::timestamptz`,
      ];

      if (appId) {
        filters.push(sql`a.app_id = ${appId}`);
      }

      if (webhookId) {
        filters.push(sql`a.app_webhook_id = ${webhookId}`);
      }

      const { rows } = await db.execute<{
        time: Date;
        eventualSuccessRate: string;
        firstSuccessRate: string;
      }>(sql`
        WITH
          per_delivery AS (
            SELECT
              a.app_webhook_delivery_id,
              MIN(a.attempt_number) FILTER (WHERE a.response_status BETWEEN 200 AND 399) AS first_success_attempt,
              BOOL_OR(a.response_status BETWEEN 200 AND 399) AS eventually_delivered,
              MIN(a.attempted_at) AS first_attempt_at
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE
              ${sql.join(filters, sql` AND `)}
            GROUP BY 1 
          ),
          by_bucket AS (
            SELECT 
              date_bin(${bucketToUse}::interval, pd.first_attempt_at, '1970-01-01'::timestamptz) AS bucket,
              AVG(pd.eventually_delivered::int) AS event_success_rate,
              AVG(CASE WHEN pd.first_success_attempt = 1 THEN 1 ELSE 0 END) AS first_success_rate
            FROM per_delivery pd
            GROUP BY 1
          ),
          series AS (
            SELECT g::timestamptz AS bucket
            FROM generate_series(
              date_bin(${bucketToUse}::interval, ${fromToUse}::timestamptz, '1970-01-01'::timestamptz),
              date_bin(${bucketToUse}::interval, ${toToUse}::timestamptz,   '1970-01-01'::timestamptz),
              ${bucketToUse}::interval
            ) g
          )

          SELECT
            s.bucket::timestamptz AS time,
            COALESCE(by_bucket.event_success_rate, 0) AS "eventualSuccessRate",
            COALESCE(by_bucket.first_success_rate, 0) AS "firstSuccessRate"
          FROM series s
          LEFT JOIN by_bucket ON (s.bucket = by_bucket.bucket)
          ORDER BY s.bucket;
      `);

      return c.json(
        formatResponseUsingZodSchema(AnalyticsSuccessRatesGetResponseSchema, {
          results: rows,
          info: {
            bucket,
            from: fromToUse,
            to: toToUse,
          },
        }),
        200,
      );
    },
  );
}
