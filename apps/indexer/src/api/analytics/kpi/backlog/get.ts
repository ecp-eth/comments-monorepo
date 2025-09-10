import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../../services";
import {
  OpenAPIDateStringSchema,
  OpenAPIFloatFromDbSchema,
} from "../../../../lib/schemas";
import { sql } from "drizzle-orm";
import { schema } from "../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

const AnalyticsKpiBacklogGetResponseSchema = z.object({
  inProgress: OpenAPIFloatFromDbSchema,
  pending: OpenAPIFloatFromDbSchema,
  processing: OpenAPIFloatFromDbSchema,
  nextDueAt: OpenAPIDateStringSchema.nullable(),
  oldestAgeSec: z.number().int().nonnegative().nullable(),
});

export function setupAnalyticsKpiBacklogGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/kpi/backlog",
      middleware: siweMiddleware,
      tags: ["analytics", "kpi", "backlog"],
      description: "Get the backlog KPI",
      responses: {
        200: {
          description: "The backlog KPI",
          content: {
            "application/json": {
              schema: AnalyticsKpiBacklogGetResponseSchema,
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
      const { rows } = await db.execute<{
        inProgress: string;
        pending: string;
        processing: string;
        nextDueAt: Date | null;
        oldestAgeSec: number | null;
      }>(sql`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('success','failure')) AS "inProgress",
          COUNT(*) FILTER (WHERE status = 'pending')                  AS pending,
          COUNT(*) FILTER (WHERE status = 'processing')               AS "processing",
          MIN(next_attempt_at) FILTER (WHERE status NOT IN('success','failure')) AS "nextDueAt",
          EXTRACT(EPOCH FROM (now() - MIN(created_at)))::int          AS "oldestAgeSec"
        FROM ${schema.appWebhookDelivery} d
        WHERE d.app_webhook_id IN (
          SELECT w.id FROM ${schema.appWebhook} w
          JOIN ${schema.app} ap ON ap.id = w.app_id
          WHERE ap.owner_id = ${c.get("user").id}
        );
      `);

      if (!rows[0]) {
        return c.json(
          formatResponseUsingZodSchema(AnalyticsKpiBacklogGetResponseSchema, {
            inProgress: 0,
            pending: 0,
            processing: 0,
            nextDueAt: null,
            oldestAgeSec: 0,
          }),
          200,
        );
      }

      return c.json(
        formatResponseUsingZodSchema(
          AnalyticsKpiBacklogGetResponseSchema,
          rows[0],
        ),
        200,
      );
    },
  );
}
