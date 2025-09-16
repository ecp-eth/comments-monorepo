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

export const AnalyticsSlaBandsGetQueryParamsSchema = z
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

export const AnalyticsSlaBandsGetResponseSchema = z.object({
  results: z.array(
    z.object({
      time: OpenAPIDateStringSchema,
      bands: z.object({
        "5s": OpenAPIFloatFromDbSchema,
        "10s": OpenAPIFloatFromDbSchema,
        "30s": OpenAPIFloatFromDbSchema,
        "60s": OpenAPIFloatFromDbSchema,
        "300s": OpenAPIFloatFromDbSchema,
        ">300s": OpenAPIFloatFromDbSchema,
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
      description: "Get the analytics sla bands of delivery attempts",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsSlaBandsGetQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics sla bands of delivery attempts",
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
        "5s": number;
        "10s": number;
        "30s": number;
        "60s": number;
        "300s": number;
        ">300s": number;
      }>(sql`
        WITH
          successful_attempts AS (
            SELECT
              d.id as delivery_id,
              e.created_at,
              MIN(a.attempted_at) FILTER (WHERE a.response_status BETWEEN 200 AND 399) AS success_at
            FROM ${schema.appWebhookDeliveryAttempt} a
            JOIN ${schema.appWebhookDelivery} d ON (d.id = a.app_webhook_delivery_id)
            JOIN ${schema.eventOutbox} e ON (e.id = d.event_id)
            WHERE
              ${sql.join(filters, sql` AND `)}
            GROUP BY 1, 2
          ),
          by_bucket AS (
            SELECT
              date_bin(${bucketToUse}::interval, sa.created_at, '1970-01-01'::timestamptz) AS bucket,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '5 seconds') AS "5s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '10 seconds') AS "10s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '30 seconds') AS "30s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '60 seconds') AS "60s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at <= INTERVAL '300 seconds') AS "300s",
              COUNT(*) FILTER (WHERE sa.success_at IS NOT NULL AND sa.success_at - sa.created_at > INTERVAL '300 seconds') AS ">300s"
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
            COALESCE(bb."5s"::float / NULLIF(bb.total, 0), 0)::float AS "5s",
            COALESCE(bb."10s"::float / NULLIF(bb.total, 0), 0)::float AS "10s",
            COALESCE(bb."30s"::float / NULLIF(bb.total, 0), 0)::float AS "30s",
            COALESCE(bb."60s"::float / NULLIF(bb.total, 0), 0)::float AS "60s",
            COALESCE(bb."300s"::float / NULLIF(bb.total, 0), 0)::float AS "300s",
            COALESCE(bb.">300s"::float / NULLIF(bb.total, 0), 0)::float AS ">300s"
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
