import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas";
import { db, siweMiddleware } from "../../../services";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../schema";
import { AnalyticsQueryParamsSchema } from "../schemas";

export const AnalyticsErrorsGetResponseSchema = z.object({
  results: z.array(
    z.object({
      time: OpenAPIDateStringSchema,
      http4xx: OpenAPIBigintStringSchema,
      http5xx: OpenAPIBigintStringSchema,
      timeout: OpenAPIBigintStringSchema,
      other: OpenAPIBigintStringSchema,
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: OpenAPIDateStringSchema,
    to: OpenAPIDateStringSchema,
  }),
});

export function setupAnalyticsErrorsGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/errors",
      tags: ["analytics", "errors"],
      description: "Get the analytics errors breakdown",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics errors breakdown",
          content: {
            "application/json": {
              schema: AnalyticsErrorsGetResponseSchema,
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
        timeout: string;
        http4xx: string;
        http5xx: string;
        other: string;
      }>(sql`
        WITH
          attempts AS (
            SELECT
              a.response_status,
              date_bin(${bucketToUse}::interval, a.attempted_at, ${originForBucket}::timestamptz) AS bucket
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
          ),
          by_bucket AS (
            SELECT
              a.bucket,
              COUNT(*) FILTER (WHERE a.response_status = -1) as timeout,
              COUNT(*) FILTER (WHERE a.response_status BETWEEN 400 AND 499) as http4xx,
              COUNT(*) FILTER (WHERE a.response_status BETWEEN 500 AND 599) as http5xx,
              COUNT(*) FILTER (WHERE a.response_status < -1) as other
            FROM attempts a
            GROUP BY 1
          )

          SELECT
            s.bucket::timestamptz AS time,
            COALESCE(bb.timeout, 0) as timeout,
            COALESCE(bb.http4xx, 0) as http4xx,
            COALESCE(bb.http5xx, 0) as http5xx,
            COALESCE(bb.other, 0) as other
          FROM series s
          LEFT JOIN by_bucket bb ON (s.bucket = bb.bucket)
          ORDER BY s.bucket;
      `);

      return c.json(
        formatResponseUsingZodSchema(AnalyticsErrorsGetResponseSchema, {
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
