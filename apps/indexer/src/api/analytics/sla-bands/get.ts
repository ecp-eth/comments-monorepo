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

export const AnalyticsSlaBandsGetQueryParamsSchema = z
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

export const AnalyticsSlaBandsGetResponseSchema = z.object({
  results: z.array(
    z.object({
      time: OpenAPIDateStringSchema,
      bands: z.object({
        "10s": OpenAPIFloatFromDbSchema,
        "30s": OpenAPIFloatFromDbSchema,
        "60s": OpenAPIFloatFromDbSchema,
        "300s": OpenAPIFloatFromDbSchema,
      }),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: OpenAPIDateStringSchema,
    to: OpenAPIDateStringSchema,
  }),
});

export function setupAnalyticsSlaBandsGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/sla-bands",
      tags: ["analytics", "sla-bands"],
      description: "Get the analytics sla bands",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsSlaBandsGetQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics sla bands",
          content: {
            "application/json": {
              schema: AnalyticsSlaBandsGetResponseSchema,
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
        "10s": number;
        "30s": number;
        "60s": number;
        "300s": number;
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
          successful_attempts AS (
            SELECT
              d.id as delivery_id,
              e.created_at,
              MIN(a.attempted_at) FILTER (WHERE a.is_success) AS success_at
            FROM attempts a
            JOIN ${schema.appWebhookDelivery} d ON (d.id = a.app_webhook_delivery_id)
            JOIN ${schema.eventOutbox} e ON (e.id = d.event_id)
            GROUP BY 1, 2
          ),
          by_bucket AS (
            SELECT
              date_bin(${bucketToUse}::interval, sa.created_at, '1970-01-01'::timestamptz) AS bucket,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '10 seconds') AS "10s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '30 seconds') AS "30s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '60 seconds') AS "60s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '300 seconds') AS "300s"
            FROM successful_attempts sa
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
            COALESCE(bb."10s"::float / NULLIF(bb.total, 0), 0)::float AS "10s",
            COALESCE(bb."30s"::float / NULLIF(bb.total, 0), 0)::float AS "30s",
            COALESCE(bb."60s"::float / NULLIF(bb.total, 0), 0)::float AS "60s",
            COALESCE(bb."300s"::float / NULLIF(bb.total, 0), 0)::float AS "300s"
          FROM series s
          LEFT JOIN by_bucket bb ON (s.bucket = bb.bucket)
          ORDER BY s.bucket;
      `);

      return c.json(
        formatResponseUsingZodSchema(AnalyticsSlaBandsGetResponseSchema, {
          results: rows.map((row) => ({
            time: row.time,
            bands: row,
          })),
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
