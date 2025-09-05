import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookManager,
  db,
  siweMiddleware,
} from "../../../../../../../../services";
import { AppManagerAppNotFoundError } from "../../../../../../../../services/app-manager-service";
import { schema } from "../../../../../../../../../schema";
import { sql } from "drizzle-orm";
import { formatResponseUsingZodSchema } from "../../../../../../../../lib/response-formatters";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../../../services/app-webhook-manager-service";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
} from "../../../../../../../../lib/schemas";

export const AppWebhookAnalyticsLatencyResponseHistogramGetRequestParamsSchema =
  z.object({
    appId: z.string().uuid(),
    webhookId: z.string().uuid(),
  });

export const AppWebhookAnalyticsLatencyResponseHistogramGetRequestQuerySchema =
  z.object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    tz: z.string().default("UTC"),
    bucket: z
      .enum(["hour", "day", "week", "month", "year"])
      .default("day")
      .transform((val) => `1 ${val}`),
  });

const OpenAPIDbBigIntSchema = z.preprocess((v) => {
  if (typeof v === "string" || typeof v === "bigint" || typeof v === "number") {
    return BigInt(v);
  }

  return v;
}, OpenAPIBigintStringSchema);

const OpenAPIDbFloatSchema = z.preprocess((v) => {
  if (typeof v === "string" || typeof v === "number") {
    return Number(v);
  }

  return v;
}, z.number());

export const AppWebhookAnalyticsLatencyResponseHistogramGetResponseSchema =
  z.object({
    results: z.array(
      z.object({
        bin: z.number().int(),
        startMs: z.number(),
        endMs: z.number(),
        centerMs: z.number(),
        label: z.string(),
        count: OpenAPIDbBigIntSchema,
        total: OpenAPIDbBigIntSchema,
        pctOfTotal: OpenAPIDbFloatSchema,
      }),
    ),
  });

const NUM_BUCKETS = 5;

export function setupGetAppWebhookAnalyticsLatencyResponseHistogram(
  app: OpenAPIHono,
) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{appId}/webhooks/{webhookId}/analytics/latency-response/histogram",
      middleware: siweMiddleware,
      request: {
        params:
          AppWebhookAnalyticsLatencyResponseHistogramGetRequestParamsSchema,
        query: AppWebhookAnalyticsLatencyResponseHistogramGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "Webhook analytics latency response",
          content: {
            "application/json": {
              schema:
                AppWebhookAnalyticsLatencyResponseHistogramGetResponseSchema,
            },
          },
        },
        400: {
          description: "Bad request",
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
        404: {
          description: "App or webhook not found",
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
      const { appId, webhookId } = c.req.valid("param");
      const { from, to } = c.req.valid("query");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhook } = await appWebhookManager.getAppWebhook({
          appId: app.id,
          webhookId,
        });

        const { rows } = await db.execute<{
          bin: number;
          startMs: number;
          endMs: number;
          centerMs: number;
          label: string;
          count: string;
          total: string;
          pctOfTotal: string;
        }>(sql`
          WITH attempts AS (
            SELECT a.response_ms::double precision AS ms
            FROM ${schema.appWebhookDeliveryAttempt} a
            WHERE a.attempted_at >= ${from}
              AND a.attempted_at < ${to}
              AND a.app_webhook_id = ${appWebhook.id}
              AND a.response_status BETWEEN 200 AND 399
          ),
          robust AS (
            SELECT
              percentile_cont(0.01) WITHIN GROUP (ORDER BY ms) AS p01,
              percentile_cont(0.99) WITHIN GROUP (ORDER BY ms) AS p99,
              COUNT(*)::bigint AS total
            FROM attempts
          ),
          params AS (
            SELECT
              ${NUM_BUCKETS}::int AS buckets,                                       
              COALESCE(GREATEST(100::float8, p01), 100::float8) AS lo,
              COALESCE(LEAST(5000::float8, p99), 5000::float8) AS hi,
              total
            FROM robust
          ),
          -- guard against degenerate case (all equal or no data)
          safe AS (
            SELECT
              buckets,
              CASE WHEN hi <= lo THEN lo - 0.5 ELSE lo END AS lo,
              CASE WHEN hi <= lo THEN lo + 0.5 ELSE hi END AS hi,
              GREATEST(total, 0) AS total
            FROM params
          ),
          bin_defs AS (
            SELECT
              gs AS bin,
              (lo + (gs - 1) * ((hi - lo) / buckets)) AS start_ms,
              (lo +  gs      * ((hi - lo) / buckets)) AS end_ms
            FROM safe, LATERAL generate_series(1, buckets) AS gs
          ),
          counts AS (
            SELECT
              width_bucket(ms, (SELECT lo FROM safe), (SELECT hi FROM safe), (SELECT buckets FROM safe)) AS bin,
              COUNT(*)::bigint AS count
            FROM attempts
            GROUP BY 1
          )

          SELECT
            b.bin,
            ROUND(b.start_ms)::int    AS "startMs",
            ROUND(b.end_ms)::int      AS "endMs",
            ROUND((b.start_ms + b.end_ms)/2.0)::int AS "centerMs",
            CONCAT(ROUND(b.start_ms)::int, '-', ROUND(b.end_ms)::int, ' ms') AS "label",
            COALESCE(c.count, 0)      AS "count",
            COALESCE(safe.total, 0)   AS "total",
            CASE WHEN COALESCE(safe.total,0) = 0 THEN 0
                ELSE ROUND(100.0 * COALESCE(c.count,0) / safe.total, 2)
            END AS "pctOfTotal"
          FROM bin_defs b
          LEFT JOIN counts c USING (bin)
          CROSS JOIN safe
          ORDER BY b.bin;
        `);

        return c.json(
          formatResponseUsingZodSchema(
            AppWebhookAnalyticsLatencyResponseHistogramGetResponseSchema,
            {
              results: rows,
            },
          ),
          200,
        );
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json({ message: "App not found" }, 404);
        }

        if (error instanceof AppWebhookManagerAppWebhookNotFoundError) {
          return c.json({ message: "Webhook not found" }, 404);
        }

        throw error;
      }
    },
  );
}
