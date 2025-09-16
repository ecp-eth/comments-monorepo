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

export const AnalyticsTerminalGetResponseSchema = z.object({
  results: z.array(
    z.object({
      time: OpenAPIDateStringSchema,
      deliveries: OpenAPIBigintStringSchema,
      successes: OpenAPIBigintStringSchema,
      failures: OpenAPIBigintStringSchema,
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: OpenAPIDateStringSchema,
    to: OpenAPIDateStringSchema,
  }),
});

export function setupAnalyticsTerminalGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/terminal",
      tags: ["analytics", "terminal"],
      description: "Get the analytics terminal outcomes of deliveries",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics terminal outcomes of deliveries",
          content: {
            "application/json": {
              schema: AnalyticsTerminalGetResponseSchema,
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
        sql`d.owner_id = ${c.get("user").id}`,
        sql`d.created_at >= ${from}::timestamptz`,
        sql`d.created_at < ${to}::timestamptz`,
      ];

      if (appId) {
        filters.push(sql`d.app_id = ${appId}`);
      }

      if (webhookId) {
        filters.push(sql`d.app_webhook_id = ${webhookId}`);
      }

      const { rows } = await db.execute<{
        time: Date;
        deliveries: string;
        successes: string;
        failures: string;
      }>(sql`
        WITH
          deliveries AS (
            SELECT
              d.status,
              date_bin(${bucketToUse}::interval, d.created_at, ${originForBucket}::timestamptz) AS bucket
            FROM ${schema.appWebhookDelivery} d
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
            COALESCE(COUNT(d.*), 0) AS deliveries,
            COALESCE(COUNT(d.*) FILTER (WHERE d.status = 'success'), 0) AS successes,
            COALESCE(COUNT(d.*) FILTER (WHERE d.status = 'failed'), 0) AS failures
          FROM series s
          LEFT JOIN deliveries d ON (s.bucket = d.bucket)
          GROUP BY s.bucket
          ORDER BY s.bucket;
      `);

      return c.json(
        formatResponseUsingZodSchema(AnalyticsTerminalGetResponseSchema, {
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
