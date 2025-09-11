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

export const AnalyticsTerminalGetQueryParamsSchema = z
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
      tags: ["analytics", "volume"],
      description: "Get the analytics terminal outcomes",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsTerminalGetQueryParamsSchema,
      },
      responses: {
        200: {
          description: "The analytics terminal outcomes",
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
      const { from, to, bucket, appId, webhookId } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);
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
        deliveries: string;
        successes: string;
        failures: string;
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
          deliveries AS (
            SELECT
              d.*,
              date_bin(${bucketToUse}::interval, d.created_at, '1970-01-01'::timestamptz) AS bucket
            FROM ${schema.appWebhookDelivery} d
            WHERE d.created_at >= ${fromToUse} AND d.created_at < ${toToUse}
              AND d.app_webhook_id IN (
                SELECT id FROM filtered_webhooks
              )
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
            from: fromToUse,
            to: toToUse,
          },
        }),
        200,
      );
    },
  );
}
