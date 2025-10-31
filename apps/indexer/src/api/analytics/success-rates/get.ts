import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
  OpenAPIFloatFromDbSchema,
} from "../../../lib/schemas";
import { db, siweMiddleware } from "../../../services";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../schema";
import { AnalyticsQueryParamsSchema } from "../schemas";

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
      tags: ["analytics", "success-rates"],
      description: "Get the analytics success rates of deliveries",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics success rates of deliveries",
          content: {
            "application/json": {
              schema: AnalyticsSuccessRatesGetResponseSchema,
            },
          },
        },
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: APIBadRequestResponseSchema,
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

      const filters: SQL[] = [
        sql`a.owner_id = ${c.get("user").id}`,
        sql`a.attempted_at >= ${from}::timestamptz`,
        sql`a.attempted_at < ${to}::timestamptz`,
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
              date_bin(${bucketToUse}::interval, pd.first_attempt_at, ${originForBucket}::timestamptz) AS bucket,
              AVG(pd.eventually_delivered::int) AS event_success_rate,
              AVG(CASE WHEN pd.first_success_attempt = 1 THEN 1 ELSE 0 END) AS first_success_rate
            FROM per_delivery pd
            GROUP BY 1
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
            from,
            to,
          },
        }),
        200,
      );
    },
  );
}
