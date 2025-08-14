import { type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  BadRequestResponse,
  ChannelSubscriptionUpdateResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
  UnsupportedMediaTypeResponse,
} from "../../../../../shared-responses";
import { db } from "../../../../../../services";
import { schema } from "../../../../../../../schema";
import { and, eq } from "drizzle-orm";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../../../middleware/siwe";

export async function channelSubscribePOST(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "post",
      path: "/api/apps/:appId/channels/:channelId/subscribe",
      tags: ["Channels", "Subscriptions"],
      description: "Subscribes to a channel",
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
        },
      },
      responses: {
        201: {
          description: "Successfully subscribed to the channel",
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
          description: "Channel not found",
          content: {
            "application/json": {
              schema: NotFoundResponse,
            },
          },
        },
        409: {
          description: "Conflict - already subscribed to the channel",
          content: {
            "application/json": {
              schema: BadRequestResponse,
            },
          },
        },
        415: {
          description: "Unsupported media type",
          content: {
            "application/json": {
              schema: UnsupportedMediaTypeResponse,
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

      if (c.req.header("content-type") !== "application/json") {
        return c.json({ error: "Unsupported media type" }, 415);
      }

      const [result] = await db
        .select()
        .from(schema.channel)
        .leftJoin(
          schema.channelSubscription,
          and(
            eq(schema.channelSubscription.appId, appId),
            eq(schema.channel.id, schema.channelSubscription.channelId),
            eq(schema.channelSubscription.userAddress, c.get("user")!.address),
          ),
        )
        .where(eq(schema.channel.id, channelId))
        .limit(1);

      if (!result) {
        return c.json({ error: "Channel not found" }, 404);
      }

      if (result.channel_subscription) {
        return c.json({ error: "Already subscribed to the channel" }, 409);
      }

      const { notificationsEnabled, userFid } = c.req.valid("json");

      const { subscription, notificationSettings } = await db.transaction(
        async (tx) => {
          const [subscription] = await tx
            .insert(schema.channelSubscription)
            .values({
              appId,
              channelId: result.channel.id,
              userAddress: c.get("user")!.address,
            })
            .returning()
            .execute();

          if (!subscription) {
            throw new Error("Failed to create subscription");
          }

          const [notificationSettings] = await tx
            .insert(schema.channelSubscriptionFarcasterNotificationSettings)
            .values({
              userFid,
              appId: subscription.appId,
              channelId: subscription.channelId,
              userAddress: subscription.userAddress,
              notificationsEnabled,
            })
            .returning()
            .execute();

          if (!notificationSettings) {
            throw new Error("Failed to create notification settings");
          }

          return {
            subscription,
            notificationSettings,
          };
        },
      );

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        ChannelSubscriptionUpdateResponse.parse({
          channelId: subscription.channelId,
          notificationsEnabled: notificationSettings.notificationsEnabled,
        }),
        201,
      );
    },
  );
}
