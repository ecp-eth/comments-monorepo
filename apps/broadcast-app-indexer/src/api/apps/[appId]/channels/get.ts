import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../../../middleware/farcaster-quick-auth-middleware";
import { schema } from "../../../../../schema";
import { db } from "../../../../services";
import { and, desc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { ChannelResponse } from "../../../shared-responses";
import { HexSchema } from "@ecp.eth/sdk/core";

function toChannelCursor(channel: { id: bigint; createdAt: Date }): string {
  return Buffer.from(
    `${channel.id.toString()}:${channel.createdAt.toISOString()}`,
  ).toString("base64url");
}

function fromChannelCursor(cursor: string): { id: bigint; createdAt: Date } {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");

  const [id, createdAt] = decoded.split(":");

  return z
    .object({
      id: z.coerce.bigint(),
      createdAt: z.coerce.date(),
    })
    .parse({
      id,
      createdAt,
    });
}

const requestQuerySchema = z.object({
  cursor: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;

      return fromChannelCursor(val);
    }),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  onlySubscribed: z
    .enum(["1", "0"])
    .transform((val) => val === "1")
    .default("0")
    .openapi({
      description:
        "If false is passed only unsubscribed channels will be returned",
    }),
});

const responseSchema = z.object({
  results: z.array(ChannelResponse),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});

export async function channelsGET(api: OpenAPIHono) {
  api.openapi(
    {
      method: "get",
      path: "/api/apps/:appId/channels",
      tags: ["Channels"],
      description: "Get a list of channels",
      middleware: [farcasterQuickAuthMiddleware] as const,
      request: {
        query: requestQuerySchema,
        params: z.object({
          appId: HexSchema,
        }),
      },
      responses: {
        200: {
          description: "List of available channels",
          content: {
            "application/json": {
              schema: responseSchema,
            },
          },
        },
      },
    },
    async (c) => {
      const { limit, cursor, onlySubscribed } = c.req.valid("query");
      const { appId } = c.req.valid("param");

      const results = await db
        .select()
        .from(schema.channel)
        .leftJoin(
          schema.channelSubscription,
          and(
            eq(schema.channel.id, schema.channelSubscription.channelId),
            eq(schema.channelSubscription.appId, appId),
            eq(schema.channelSubscription.userFid, c.get("user").fid),
          ),
        )
        .where(
          and(
            cursor
              ? or(
                  lt(schema.channel.createdAt, cursor.createdAt),
                  and(
                    eq(schema.channel.createdAt, cursor.createdAt),
                    lt(schema.channel.id, cursor.id),
                  ),
                )
              : undefined,
            onlySubscribed
              ? isNotNull(schema.channelSubscription.userFid)
              : isNull(schema.channelSubscription.userFid),
          ),
        )
        .orderBy(desc(schema.channel.createdAt), desc(schema.channel.id))
        .limit(limit + 1);

      const pageResults = results.slice(0, limit);
      const [nextCursor] = results.slice(limit);

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        responseSchema.parse({
          results: pageResults.map(({ channel, channel_subscription }) => {
            return {
              id: channel.id,
              name: channel.name,
              owner: channel.owner,
              description: channel.description,
              isSubscribed: channel_subscription !== null,
              notificationsEnabled:
                channel_subscription?.notificationsEnabled ?? false,
              createdAt: channel.createdAt,
              updatedAt: channel.updatedAt,
            };
          }),
          pageInfo: {
            hasNextPage: nextCursor !== undefined,
            nextCursor: nextCursor
              ? toChannelCursor(nextCursor.channel)
              : undefined,
          },
        }),
        200,
      );
    },
  );
}
