import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
  OpenAPIFloatFromDbSchema,
} from "../../../lib/schemas";
import { db, siweMiddleware } from "../../../services";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters";
import { sql } from "drizzle-orm";
import { schema } from "../../../../schema";

export const AnalyticsE2ELatencyGetQueryParamsSchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    bucket: z.enum(["hour", "day", "week", "month"]).default("day"),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from >= data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be before to date",
      });
    }
  });

export const AnalyticsE2ELatencyGetResponseSchema = z.object({
  results: z.array(
    z.object({
      time: OpenAPIDateStringSchema,
      latencies: z.object({
        p50: OpenAPIFloatFromDbSchema,
        p90: OpenAPIFloatFromDbSchema,
        p95: OpenAPIFloatFromDbSchema,
        p99: OpenAPIFloatFromDbSchema,
      }),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: OpenAPIDateStringSchema,
    to: OpenAPIDateStringSchema,
  }),
});

export function setupAnalyticsE2ELatencyGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/e2e-latency",
      tags: ["analytics", "e2e-latency"],
      description: "Get the analytics end to end latency in ms",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsE2ELatencyGetQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics end to end latency in ms",
          content: {
            "application/json": {
              schema: AnalyticsE2ELatencyGetResponseSchema,
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
      const { from, to, bucket } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);
      const bucketToUse = `1 ${bucket}`;

      const { rows } = await db.execute<{
        time: Date;
        percentiles: string | null;
      }>(sql`
        WITH
          attempts AS (
            SELECT
              a.*,
              date_bin(${bucketToUse}::interval, a.attempted_at, '1970-01-01'::timestamptz) AS bucket,
              a.response_status BETWEEN 200 AND 399 AS is_success
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
          first_attempts AS (
            SELECT
              app_webhook_delivery_id,
              MIN(attempted_at) AS first_attempt_at
            FROM attempts a
            GROUP BY 1
          ),
          successful_attempts AS (
            SELECT
              app_webhook_delivery_id,
              MIN(attempted_at) AS success_at
            FROM attempts a
            WHERE a.is_success
            GROUP BY 1
          ),
          latencies AS (
            SELECT
              date_bin(${bucketToUse}::interval, fa.first_attempt_at, '1970-01-01'::timestamptz) AS bucket,
              EXTRACT(EPOCH FROM (sa.success_at - e.created_at)) * 1000 AS latency
            FROM ${schema.appWebhookDelivery} d
            JOIN ${schema.eventOutbox} e ON e.id = d.event_id
            JOIN first_attempts fa ON fa.app_webhook_delivery_id = d.id
            JOIN successful_attempts sa ON sa.app_webhook_delivery_id = d.id
            WHERE
              d.app_webhook_id IN (
                SELECT w.id
                FROM ${schema.appWebhook} w
                JOIN ${schema.app} app ON app.id = w.app_id
                WHERE app.owner_id = ${c.get("user").id}
              )
              AND d.created_at >= ${fromToUse}::timestamptz
              AND d.created_at < ${toToUse}::timestamptz
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
            PERCENTILE_CONT(ARRAY[0.5,0.9,0.95,0.99]) WITHIN GROUP (ORDER BY l.latency) AS "percentiles"
          FROM series s
          LEFT JOIN latencies l ON (s.bucket = l.bucket)
          GROUP BY s.bucket
          ORDER BY s.bucket;
      `);

      return c.json(
        formatResponseUsingZodSchema(AnalyticsE2ELatencyGetResponseSchema, {
          results: rows.map((row) => {
            return {
              time: row.time,
              latencies: {
                p50: row.percentiles?.[0] ?? 0,
                p90: row.percentiles?.[1] ?? 0,
                p95: row.percentiles?.[2] ?? 0,
                p99: row.percentiles?.[3] ?? 0,
              },
            };
          }),
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
