import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../../../middleware/farcaster-quick-auth-middleware";
import {
  BadRequestResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
  UnsupportedMediaTypeResponse,
} from "../../../shared-responses";
import { db } from "../../../../services/db";
import { schema } from "../../../../../schema";
import { eq } from "drizzle-orm";

export async function channelSubscribePOST(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "post",
      path: "/api/channels/[channelId]/subscribe",
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
              schema: z.object({
                channelId: z.coerce.bigint(),
                notificationsEnabled: z.boolean().default(false),
              }),
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

      const channel = await db.query.channel.findFirst({
        where: eq(schema.channel.id, channelId),
      });

      if (!channel) {
        return c.json({ error: "Channel not found" }, 404);
      }

      const { notificationsEnabled } = c.req.valid("json");

      const [subscription] = await db
        .insert(schema.channelSubscription)
        .values({
          channelId: channel.id,
          userId: c.get("user").fid,
          notificationsEnabled,
        })
        .returning()
        .execute();

      if (!subscription) {
        throw new Error("Failed to create subscription");
      }

      return c.json(
        {
          channelId: subscription.channelId,
          notificationsEnabled: subscription.notificationsEnabled,
        },
        201,
      );
    },
  );
}
