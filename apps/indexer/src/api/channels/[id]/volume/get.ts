import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  GetChannelParamsSchema,
} from "../../../../lib/schemas";
import { db } from "../../../../services";
import { sql } from "drizzle-orm";
import { schema } from "../../../../../schema";

const ChannelVolumeByIdQueryParamsSchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24).openapi({
    description: "Lookback window in hours",
    example: 24,
  }),
});

const WeiStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be a non-negative integer string (wei)")
  .openapi({ example: "892340000000000" });

const NumericIdStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be a non-negative integer string");

const ChannelVolumeByIdResponseSchema = z.object({
  channelId: NumericIdStringSchema.openapi({
    description: "On-chain channel identifier (uint256)",
    example: "42",
  }),
  txCount: z.number().int().min(0).openapi({
    description:
      "Number of transactions (CommentAdded + CommentEdited + CommentDeleted) in the time window",
    example: 142,
  }),
  gasTotal: WeiStringSchema.openapi({
    description:
      "Sum of gas costs in wei (gasUsed * effectiveGasPrice per transaction)",
  }),
  valueTotal: WeiStringSchema.openapi({
    description:
      "Sum of native ETH sent via msg.value in wei (does not include ERC-20 hook fees)",
  }),
  volumeTotal: WeiStringSchema.openapi({
    description: "gasTotal + valueTotal in wei",
  }),
});

export function setupGetChannelVolumeById(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/channels/{channelId}/volume",
      tags: ["channels", "volume"],
      description:
        "Get economic volume for a single channel over a time window",
      request: {
        params: GetChannelParamsSchema,
        query: ChannelVolumeByIdQueryParamsSchema,
      },
      responses: {
        200: {
          description: "Channel volume data",
          content: {
            "application/json": {
              schema: ChannelVolumeByIdResponseSchema,
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
        404: {
          description: "No activity found for this channel in the time window",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
      },
    },
    async (c) => {
      const { channelId } = c.req.valid("param");
      const { hours } = c.req.valid("query");

      const timeFilter = sql`${schema.channelHourlyVolume.hourTimestamp} >= NOW() - make_interval(hours => ${hours})`;

      const { rows } = await db.execute<{
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
          AND ${schema.channelHourlyVolume.channelId} = ${channelId}
        GROUP BY ${schema.channelHourlyVolume.channelId}
      `);

      const row = rows[0];

      if (!row) {
        return c.json(
          {
            message:
              "No activity found for this channel in the given time window",
          },
          404,
        );
      }

      return c.json(
        {
          channelId: row.channel_id,
          txCount: row.tx_count,
          gasTotal: row.gas_total,
          valueTotal: row.value_total,
          volumeTotal: row.volume_total,
        },
        200,
      );
    },
  );
}
