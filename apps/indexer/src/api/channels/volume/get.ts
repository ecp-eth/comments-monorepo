import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
} from "../../../lib/schemas";
import { db } from "../../../services";
import { sql } from "drizzle-orm";
import { schema } from "../../../../schema";

const ChannelVolumeQueryParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    description: "Number of channels per page",
    example: 50,
  }),
  page: z.coerce.number().int().min(1).default(1).openapi({
    description: "Page number",
    example: 1,
  }),
  hours: z.coerce.number().int().min(1).max(168).default(24).openapi({
    description: "Lookback window in hours",
    example: 24,
  }),
});

const ChannelVolumeGetResponseSchema = z.object({
  results: z.array(
    z.object({
      channelId: z.string(),
      txCount: z.number(),
      gasTotal: z.string(),
      valueTotal: z.string(),
      volumeTotal: z.string(),
    }),
  ),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export function setupGetChannelVolume(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/channels/volume",
      tags: ["channels", "volume"],
      description: "Get channels ranked by economic volume over a time window",
      request: {
        query: ChannelVolumeQueryParamsSchema,
      },
      responses: {
        200: {
          description: "Channels ranked by economic volume",
          content: {
            "application/json": {
              schema: ChannelVolumeGetResponseSchema,
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
      const { limit, page, hours } = c.req.valid("query");
      const offset = (page - 1) * limit;

      const timeFilter = sql`${schema.channelHourlyVolume.hourTimestamp} >= NOW() - make_interval(hours => ${hours})`;

      const [countResult, { rows }] = await Promise.all([
        db.execute<{ total_count: string }>(sql`
          SELECT COUNT(DISTINCT ${schema.channelHourlyVolume.channelId}) AS total_count
          FROM ${schema.channelHourlyVolume}
          WHERE ${timeFilter}
        `),
        db.execute<{
          channel_id: string;
          tx_count: number;
          gas_total: string;
          value_total: string;
          volume_total: string;
        }>(sql`
          SELECT
            ${schema.channelHourlyVolume.channelId}::text AS channel_id,
            SUM(${schema.channelHourlyVolume.txCount})::integer AS tx_count,
            SUM(${schema.channelHourlyVolume.gasTotal})::text AS gas_total,
            SUM(${schema.channelHourlyVolume.valueTotal})::text AS value_total,
            SUM(${schema.channelHourlyVolume.volumeTotal})::text AS volume_total
          FROM ${schema.channelHourlyVolume}
          WHERE ${timeFilter}
          GROUP BY ${schema.channelHourlyVolume.channelId}
          ORDER BY SUM(${schema.channelHourlyVolume.volumeTotal}) DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
      ]);

      const totalCount = Number(countResult.rows[0]?.total_count ?? 0);
      const totalPages = Math.ceil(totalCount / limit);

      return c.json(
        {
          results: rows.map((row) => ({
            channelId: row.channel_id,
            txCount: row.tx_count,
            gasTotal: row.gas_total,
            valueTotal: row.value_total,
            volumeTotal: row.volume_total,
          })),
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
          },
        },
        200,
      );
    },
  );
}
