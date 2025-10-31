import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas";
import { db, siweMiddleware } from "../../../services";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../schema";
import { AnalyticsQueryParamsSchema } from "../schemas";

export const AnalyticsVolumeGetResponseSchema = z.object({
  results: z.array(
    z.object({
      time: OpenAPIDateStringSchema,
      attempts: OpenAPIBigintStringSchema,
      successes: OpenAPIBigintStringSchema,
      failures: OpenAPIBigintStringSchema,
      http4xx: OpenAPIBigintStringSchema,
      http5xx: OpenAPIBigintStringSchema,
      transport: OpenAPIBigintStringSchema,
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: OpenAPIDateStringSchema,
    to: OpenAPIDateStringSchema,
  }),
});

export function setupAnalyticsVolumeGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/volume",
      tags: ["analytics", "volume"],
      description: "Get the analytics volume of delivery attempts",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics volume of delivery attempts",
          content: {
            "application/json": {
              schema: AnalyticsVolumeGetResponseSchema,
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
        attempts: string;
        successes: string;
        failures: string;
        transport: string;
        http4xx: string;
        http5xx: string;
      }>(sql`
        WITH
          attempts AS (
            SELECT
              a.response_status,
              date_bin(${bucketToUse}::interval, a.attempted_at, ${originForBucket}::timestamptz) AS bucket,
              a.response_status BETWEEN 200 AND 399 AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE
              ${sql.join(filters, sql` AND `)}
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
            COALESCE(COUNT(a.*), 0) AS attempts,
            COALESCE(COUNT(a.*) FILTER (WHERE a.is_success IS TRUE), 0) AS successes,
            COALESCE(COUNT(a.*) FILTER (WHERE a.is_success IS FALSE), 0) AS failures,
            COALESCE(COUNT(a.*) FILTER (WHERE (a.response_status <= 0)), 0) AS transport,
            COALESCE(COUNT(a.*) FILTER (WHERE a.response_status BETWEEN 400 AND 499), 0) AS http4xx,
            COALESCE(COUNT(a.*) FILTER (WHERE a.response_status BETWEEN 500 AND 599), 0) AS http5xx
          FROM series s
          LEFT JOIN attempts a ON (s.bucket = a.bucket)
          GROUP BY s.bucket
          ORDER BY s.bucket;
      `);

      return c.json(
        formatResponseUsingZodSchema(AnalyticsVolumeGetResponseSchema, {
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
