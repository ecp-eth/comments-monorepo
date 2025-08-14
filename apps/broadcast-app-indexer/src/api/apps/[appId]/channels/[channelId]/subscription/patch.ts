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
import { HTTPException } from "hono/http-exception";

export async function channelSubscriptionPATCH(
  api: OpenAPIHono,
): Promise<void> {
  api.openapi(
    {
      method: "patch",
      path: "/api/apps/:appId/channels/:channelId/subscription",
      tags: ["Channels", "Subscriptions"],
      description: "Updates subscription settings for a channel",
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
                notificationsEnabled: z.boolean().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: "Successfully updated subscription settings",
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
          description: "Subscription not found",
          content: {
            "application/json": {
              schema: NotFoundResponse,
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

      if (c.req.header("Content-Type") !== "application/json") {
        return c.json({ error: "Unsupported media type" }, 415);
      }

      const update = c.req.valid("json");
      const updates: {
        notificationsEnabled?: boolean;
      } = {};

      if (update.notificationsEnabled != null) {
        updates.notificationsEnabled = update.notificationsEnabled;
      }

      if (Object.keys(updates).length === 0) {
        return c.json({ error: "No updates provided" }, 400);
      }

      const { notificationSettings, subscription } = await db.transaction(
        async (tx) => {
          const [subscription] = await db
            .update(schema.channelSubscription)
            .set({
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.channelSubscription.channelId, channelId),
                eq(schema.channelSubscription.appId, appId),
                eq(
                  schema.channelSubscription.userAddress,
                  c.get("user")!.address,
                ),
              ),
            )
            .returning()
            .execute();

          if (!subscription) {
            throw new HTTPException(404, {
              message: "Subscription not found",
            });
          }

          const [notificationSettings] = await tx
            .update(schema.channelSubscriptionFarcasterNotificationSettings)
            .set({
              notificationsEnabled: updates.notificationsEnabled,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(
                  schema.channelSubscriptionFarcasterNotificationSettings
                    .channelId,
                  channelId,
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
                eq(
                  schema.channelSubscriptionFarcasterNotificationSettings
                    .userFid,
                  update.userFid,
                ),
              ),
            )
            .returning()
            .execute();

          if (!notificationSettings) {
            throw new HTTPException(404, {
              message: "Notification settings not found",
            });
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
        200,
      );
    },
  );
}
