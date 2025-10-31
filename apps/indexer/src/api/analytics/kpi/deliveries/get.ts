import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../../services";
import { OpenAPIBigintStringSchema } from "../../../../lib/schemas";
import { type SQL, sql } from "drizzle-orm";
import { schema } from "../../../../../schema";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
} from "../../../../lib/schemas";

export const AnalyticsKpiDeliveriesGetQueryParamsSchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
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

const AnalyticsKpiDeliveriesGetResponseSchema = z.object({
  deliveries: OpenAPIBigintStringSchema,
});

export function setupAnalyticsKpiDeliveriesGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/analytics/kpi/deliveries",
      middleware: siweMiddleware,
      request: {
        query: AnalyticsKpiDeliveriesGetQueryParamsSchema,
      },
      tags: ["analytics", "kpi", "deliveries"],
      description: "Get the deliveries live status",
      responses: {
        200: {
          description: "The deliveries live status",
          content: {
            "application/json": {
              schema: AnalyticsKpiDeliveriesGetResponseSchema,
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
      const { from, to, appId, webhookId } = c.req.valid("query");
      const toToUse = to ?? new Date();
      const fromToUse =
        from ?? new Date(toToUse.getTime() - 1000 * 60 * 60 * 24 * 7);

      const filters: SQL[] = [
        sql`d.created_at >= ${fromToUse}::timestamptz`,
        sql`d.created_at < ${toToUse}::timestamptz`,
        sql`d.owner_id = ${c.get("user").id}`,
      ];

      if (appId) {
        filters.push(sql`d.app_id = ${appId}`);
      }

      if (webhookId) {
        filters.push(sql`d.app_webhook_id = ${webhookId}`);
      }

      const { rows } = await db.execute<{ deliveries: string }>(sql`
        SELECT
          COUNT(*) as deliveries
        FROM ${schema.appWebhookDelivery} d
        WHERE
          ${sql.join(filters, sql` AND `)}
      `);

      if (!rows[0]) {
        return c.json(
          formatResponseUsingZodSchema(
            AnalyticsKpiDeliveriesGetResponseSchema,
            { deliveries: BigInt(0) },
          ),
          200,
        );
      }

      return c.json(
        formatResponseUsingZodSchema(
          AnalyticsKpiDeliveriesGetResponseSchema,
          rows[0],
        ),
        200,
      );
    },
  );
}
