import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { schema } from "../../../../../schema";
import { db } from "../../../../services";
import { and, desc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { ChannelResponse } from "../../../shared-responses";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../middleware/siwe";

function toChannelCursor(channel: { id: bigint; createdAt: Date }): string {
  return Buffer.from(
    `${channel.id.toString()}#${channel.createdAt.toISOString()}`,
  ).toString("base64url");
}

function fromChannelCursor(cursor: string): { id: bigint; createdAt: Date } {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");

  const [id, createdAt] = decoded.split("#");

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
  subscriptionFilter: z
    .enum(["subscribed", "unsubscribed"])
    .default("unsubscribed")
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
      middleware: siweMiddleware,
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
      const { limit, cursor, subscriptionFilter } = c.req.valid("query");
      const { appId } = c.req.valid("param");

      const results = await db
        .select()
        .from(schema.channel)
        .leftJoin(
          schema.channelSubscription,
          and(
            eq(schema.channel.id, schema.channelSubscription.channelId),
            eq(schema.channelSubscription.userAddress, c.get("user")!.address),
          ),
        )
        .leftJoin(
          schema.channelSubscriptionFarcasterNotificationSettings,
          and(
            eq(
              schema.channelSubscriptionFarcasterNotificationSettings.channelId,
              schema.channel.id,
            ),
            eq(
              schema.channelSubscriptionFarcasterNotificationSettings.appId,
              appId,
            ),
            eq(
              schema.channelSubscriptionFarcasterNotificationSettings
                .userAddress,
              c.get("user")!.address,
            ),
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
            subscriptionFilter === "subscribed"
              ? isNotNull(schema.channelSubscription.userAddress)
              : isNull(schema.channelSubscription.userAddress),
          ),
        )
        .orderBy(desc(schema.channel.createdAt), desc(schema.channel.id))
        .limit(limit + 1);

      const pageResults = results.slice(0, limit);
      const hasNextPage = results.length > limit;
      const nextCursor = pageResults[pageResults.length - 1];

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        responseSchema.parse({
          results: pageResults.map(
            ({
              channel,
              channel_subscription,
              channel_subscription_farcaster_notification_settings,
            }) => {
              return {
                id: channel.id,
                name: channel.name,
                owner: channel.owner,
                description: channel.description,
                isSubscribed: channel_subscription !== null,
                notificationsEnabled:
                  channel_subscription_farcaster_notification_settings?.notificationsEnabled ??
                  false,
                createdAt: channel.createdAt,
                updatedAt: channel.updatedAt,
              };
            },
          ),
          pageInfo: {
            hasNextPage,
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
