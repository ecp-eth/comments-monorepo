import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { schema } from "../../../../../schema";
import {
  db,
  farcasterChannelNotificationSettingsLoader,
} from "../../../../services";
import { and, desc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { ChannelResponse } from "../../../shared-responses";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../middleware/siwe";

function toChannelCursor(channel: {
  hasSubscription: boolean;
  id: bigint;
  createdAt: Date;
}): string {
  return Buffer.from(
    `${channel.hasSubscription}#${channel.id.toString()}#${channel.createdAt.toISOString()}`,
  ).toString("base64url");
}

function fromChannelCursor(cursor: string): {
  hasSubscription: boolean;
  id: bigint;
  createdAt: Date;
} {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");

  const [hasSubscription, id, createdAt] = decoded.split("#");

  return z
    .object({
      hasSubscription: z
        .enum(["true", "false"])
        .transform((val) => val === "true"),
      id: z.coerce.bigint(),
      createdAt: z.coerce.date(),
    })
    .parse({
      hasSubscription,
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
    .enum(["subscribed", "unsubscribed", "all"])
    .default("all")
    .openapi({
      description:
        "Filter by subscription status. If all is selected then first subscribed channels are returned and then the rest.",
    }),
});

const responseSchema = z.object({
  results: z.array(ChannelResponse),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});

type ResponseInput = z.input<typeof responseSchema>;

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
      const userAddress = c.get("user")!.address;

      const results = await db
        .select()
        .from(schema.channel)
        .leftJoin(
          schema.channelSubscription,
          and(
            eq(schema.channel.id, schema.channelSubscription.channelId),
            eq(schema.channelSubscription.userAddress, userAddress),
          ),
        )
        .where(
          and(
            cursor
              ? or(
                  lt(
                    isNotNull(schema.channelSubscription.channelId),
                    cursor.hasSubscription,
                  ),
                  and(
                    eq(
                      isNotNull(schema.channelSubscription.channelId),
                      cursor.hasSubscription,
                    ),
                    or(
                      lt(schema.channel.createdAt, cursor.createdAt),
                      and(
                        eq(schema.channel.createdAt, cursor.createdAt),
                        lt(schema.channel.id, cursor.id),
                      ),
                    ),
                  ),
                )
              : undefined,
            subscriptionFilter === "subscribed"
              ? isNotNull(schema.channelSubscription.userAddress)
              : undefined,
            subscriptionFilter === "unsubscribed"
              ? isNull(schema.channelSubscription.userAddress)
              : undefined,
          ),
        )
        .orderBy(
          desc(isNotNull(schema.channelSubscription.channelId)),
          desc(schema.channel.createdAt),
          desc(schema.channel.id),
        )
        .limit(limit + 1);

      const pageResults = results.slice(0, limit);
      const hasNextPage = results.length > limit;
      const nextCursor = pageResults[pageResults.length - 1];

      const resultsWithNotificationSettings = await Promise.all(
        pageResults.map((result) =>
          farcasterChannelNotificationSettingsLoader
            .load({
              appId,
              channelId: result.channel.id,
              userAddress,
            })
            .then((notificationSettings) => ({
              id: result.channel.id,
              chainId: result.channel.chainId,
              name: result.channel.name,
              owner: result.channel.owner,
              description: result.channel.description,
              isSubscribed: result.channel_subscription !== null,
              createdAt: result.channel.createdAt,
              updatedAt: result.channel.updatedAt,
              notificationSettings,
              metadata: result.channel.metadata,
            })),
        ),
      );

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        responseSchema.parse({
          results: resultsWithNotificationSettings,
          pageInfo: {
            hasNextPage,
            nextCursor: nextCursor
              ? toChannelCursor({
                  hasSubscription: !!nextCursor.channel_subscription,
                  id: nextCursor.channel.id,
                  createdAt: nextCursor.channel.createdAt,
                })
              : undefined,
          },
        } satisfies ResponseInput),
        200,
      );
    },
  );
}
