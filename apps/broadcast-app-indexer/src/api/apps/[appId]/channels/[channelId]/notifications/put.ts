import { type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  BadRequestResponse,
  ChannelSubscriptionUpdateResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "../../../../../shared-responses";
import { db } from "../../../../../../services";
import { schema } from "../../../../../../../schema";
import { and, eq } from "drizzle-orm";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../../../middleware/siwe";

export async function channelNotificationsPUT(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "put",
      path: "/api/apps/:appId/channels/:channelId/notifications",
      tags: ["Channels", "Subscriptions", "Notifications", "Farcaster"],
      description:
        "Creates or updates farcaster notifications settings for a channel",
      middleware: siweMiddleware,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
          appId: HexSchema,
        }),
        body: {
          content: {
            "application/json": {
              schema: z.object({
                userFid: z.number(),
                notificationsEnabled: z.boolean().default(false),
              }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Successfully created notifications settings",
          content: {
            "application/json": {
              schema: ChannelSubscriptionUpdateResponse,
            },
          },
        },
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: BadRequestResponse,
            },
          },
        },
        404: {
          description: "Channel not found or not subscribed to the channel",
          content: {
            "application/json": {
              schema: NotFoundResponse,
            },
          },
        },
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: InternalServerErrorResponse,
            },
          },
        },
      },
    },
    async (c) => {
      const { channelId, appId } = c.req.valid("param");

      const [result] = await db
        .select()
        .from(schema.channel)
        .leftJoin(
          schema.channelSubscription,
          and(
            eq(schema.channel.id, schema.channelSubscription.channelId),
            eq(schema.channelSubscription.userAddress, c.get("user")!.address),
          ),
        )
        .where(eq(schema.channel.id, channelId))
        .limit(1);

      if (!result) {
        return c.json({ error: "Channel not found" }, 404);
      }

      if (!result.channel_subscription) {
        return c.json({ error: "No subscription found" }, 404);
      }

      const { notificationsEnabled, userFid } = c.req.valid("json");

      const notificationSettings = await db.transaction(async (tx) => {
        const [settings] = await tx
          .insert(schema.channelSubscriptionFarcasterNotificationSettings)
          .values({
            appId,
            channelId: result.channel.id,
            userAddress: c.get("user")!.address,
            userFid,
            notificationsEnabled,
          })
          .onConflictDoUpdate({
            target: [
              schema.channelSubscriptionFarcasterNotificationSettings.appId,
              schema.channelSubscriptionFarcasterNotificationSettings.channelId,
              schema.channelSubscriptionFarcasterNotificationSettings
                .userAddress,
              schema.channelSubscriptionFarcasterNotificationSettings.userFid,
            ],
            set: {
              notificationsEnabled,
              updatedAt: new Date(),
            },
          })
          .returning()
          .execute();

        if (!settings) {
          throw new Error("Failed to create notification settings");
        }

        return settings;
      });

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        ChannelSubscriptionUpdateResponse.parse({
          channelId: result.channel.id,
          notificationsEnabled: notificationSettings.notificationsEnabled,
        }),
        200,
      );
    },
  );
}
