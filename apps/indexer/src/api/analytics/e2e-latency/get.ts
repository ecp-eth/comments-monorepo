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
import { AnalyticsQueryParamsSchema } from "../schemas";

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
      description:
        "Get the analytics end to end latency from event creation to first successful delivery attempt in ms",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsQueryParamsSchema,
      },
      responses: {
        200: {
          description:
            "The analytics end to end latency from event creation to first successful delivery attempt in ms",
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
      const { from, to, bucket, appId, webhookId, originForBucket } =
        c.req.valid("query");
      const bucketToUse = `1 ${bucket}`;

      const filters: SQL[] = [sql`app.owner_id = ${c.get("user").id}`];

      if (appId) {
        filters.push(sql`app.id = ${appId}`);
      }

      if (webhookId) {
        filters.push(sql`w.id = ${webhookId}`);
      }

      const { rows } = await db.execute<{
        time: Date;
        percentiles: string[] | null;
      }>(sql`
        WITH
          filtered_webhooks AS (
            SELECT
              w.id
            FROM ${schema.appWebhook} w
            JOIN ${schema.app} app ON (app.id = w.app_id)
            WHERE 
              ${sql.join(filters, sql` AND `)}
          ),
          delivery_stats AS (
            SELECT
              app_webhook_delivery_id,
              MIN(attempted_at) AS first_attempt_at,
              MIN(
                CASE WHEN (response_status BETWEEN 200 AND 399) THEN attempted_at END
              ) AS success_at
            FROM ${schema.appWebhookDeliveryAttempt} a
            JOIN ${schema.appWebhookDelivery} d ON (d.id = a.app_webhook_delivery_id AND d.retry_number = 0)
            WHERE
              a.attempted_at >= ${from}::timestamptz
              AND a.attempted_at < ${to}::timestamptz
              AND a.app_webhook_id IN (
                SELECT id FROM filtered_webhooks
              )
            GROUP BY 1
          ),
          latencies AS (
            SELECT
              date_bin(${bucketToUse}::interval, ds.first_attempt_at, ${originForBucket}::timestamptz) AS bucket,
              EXTRACT(EPOCH FROM (ds.success_at - e.created_at)) * 1000 AS latency
            FROM ${schema.appWebhookDelivery} d
            JOIN ${schema.eventOutbox} e ON e.id = d.event_id
            JOIN delivery_stats ds ON ds.app_webhook_delivery_id = d.id
            WHERE
              d.app_webhook_id IN (
                SELECT id FROM filtered_webhooks
              )
              AND d.created_at >= ${from}::timestamptz
              AND d.created_at < ${to}::timestamptz
          ),
          series AS (
            SELECT g::timestamptz AS bucket
            FROM generate_series(
              date_bin(${bucketToUse}::interval, ${from}::timestamptz, ${originForBucket}::timestamptz),
              date_bin(${bucketToUse}::interval, ${to}::timestamptz,   ${originForBucket}::timestamptz),
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
            from,
            to,
          },
        }),
        200,
      );
    },
  );
}
