import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../../../middleware/farcaster-quick-auth-middleware";
import {
  BadRequestResponse,
  ChannelSubscriptionUpdateResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
  UnsupportedMediaTypeResponse,
} from "../../../shared-responses";
import { db } from "../../../../services";
import { schema } from "../../../../../schema";
import { and, eq } from "drizzle-orm";

export async function channelSubscribePOST(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "post",
      path: "/api/channels/:channelId/subscribe",
      tags: ["Channels", "Subscriptions"],
      description: "Subscribes to a channel",
      middleware: [farcasterQuickAuthMiddleware] as const,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
        }),
        body: {
          content: {
            "application/json": {
              schema: z.object({
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
      const { channelId } = c.req.valid("param");

      if (c.req.header("content-type") !== "application/json") {
        return c.json({ error: "Unsupported media type" }, 415);
      }

      const [result] = await db
        .select()
        .from(schema.channel)
        .leftJoin(
          schema.channelSubscription,
          and(
            eq(schema.channel.id, schema.channelSubscription.channelId),
            eq(schema.channelSubscription.userFid, c.get("user").fid),
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

      const { notificationsEnabled } = c.req.valid("json");

      const [subscription] = await db
        .insert(schema.channelSubscription)
        .values({
          channelId: result.channel.id,
          userFid: c.get("user").fid,
          notificationsEnabled,
        })
        .returning()
        .execute();

      if (!subscription) {
        throw new Error("Failed to create subscription");
      }

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        ChannelSubscriptionUpdateResponse.parse({
          channelId: subscription.channelId,
          notificationsEnabled: subscription.notificationsEnabled,
        }),
        201,
      );
    },
  );
}
