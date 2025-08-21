import { type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  BadRequestResponse,
  ChannelSubscriptionUpdateResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "../../../../../../shared-responses";
import { db } from "../../../../../../../services";
import { schema } from "../../../../../../../../schema";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../../../../middleware/siwe";
import { HTTPException } from "hono/http-exception";

export async function channelFarcasterNotificationsPUT(
  api: OpenAPIHono,
): Promise<void> {
  api.openapi(
    {
      method: "put",
      path: "/api/apps/:appId/channels/:channelId/farcaster/:clientFid/notifications",
      tags: ["Channels", "Subscriptions", "Notifications", "Farcaster"],
      description:
        "Creates or updates farcaster notifications settings for a channel",
      middleware: siweMiddleware,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
          appId: HexSchema,
          clientFid: z.coerce.number().int(),
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
      const { clientFid, channelId, appId } = c.req.valid("param");
      const { notificationsEnabled, userFid } = c.req.valid("json");

      const notificationSettings = await db.transaction(async (tx) => {
        // check if subscription to a channel exists
        const subscription = await tx.query.channelSubscription.findFirst({
          where(fields, operators) {
            return operators.and(
              operators.eq(fields.channelId, channelId),
              operators.eq(fields.userAddress, c.get("user")!.address),
            );
          },
        });

        if (!subscription) {
          throw new HTTPException(404, {
            message: "Channel subscription not found",
          });
        }

        // check if global app notification settings exist
        const existingSettings =
          await tx.query.userFarcasterMiniAppSettings.findFirst({
            where(fields, operators) {
              return operators.and(
                operators.eq(fields.appId, appId),
                operators.eq(fields.clientFid, clientFid),
                operators.eq(fields.userAddress, c.get("user")!.address),
                operators.eq(fields.userFid, userFid),
              );
            },
          });

        if (!existingSettings) {
          throw new HTTPException(404, {
            message: "App notification settings not found",
          });
        }

        const [settings] = await tx
          .insert(schema.channelSubscriptionFarcasterNotificationSettings)
          .values({
            appId: existingSettings.appId,
            clientFid: existingSettings.clientFid,
            channelId: subscription.channelId,
            userAddress: existingSettings.userAddress,
            userFid: existingSettings.userFid,
            notificationsEnabled,
          })
          .onConflictDoUpdate({
            target: [
              schema.channelSubscriptionFarcasterNotificationSettings.appId,
              schema.channelSubscriptionFarcasterNotificationSettings.clientFid,
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
          channelId: notificationSettings.channelId,
          notificationsEnabled: notificationSettings.notificationsEnabled,
        }),
        200,
      );
    },
  );
}
