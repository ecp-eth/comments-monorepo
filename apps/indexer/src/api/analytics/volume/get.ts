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

export const AnalyticsVolumeGetQueryParamsSchema = z
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
        query: AnalyticsVolumeGetQueryParamsSchema,
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
              date_bin(${bucketToUse}::interval, a.attempted_at, '1970-01-01'::timestamptz) AS bucket,
              a.response_status BETWEEN 200 AND 399 AS is_success
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE
              ${sql.join(filters, sql` AND `)}
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
            from: fromToUse,
            to: toToUse,
          },
        }),
        200,
      );
    },
  );
}
