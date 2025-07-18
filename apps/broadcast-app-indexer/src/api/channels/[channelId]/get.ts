import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../../middleware/farcaster-quick-auth-middleware";
import {
  BadRequestResponse,
  ChannelResponse,
  NotFoundResponse,
} from "../../shared-responses";
import { db } from "../../../services/db";
import { eq } from "drizzle-orm";
import { schema } from "../../../../schema";

export async function channelGET(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "get",
      path: "/api/channels/:channelId",
      tags: ["Channels"],
      description: "Get a channel by ID",
      middleware: [farcasterQuickAuthMiddleware] as const,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
        }),
      },
      responses: {
        200: {
          description: "Channel details",
          content: {
            "application/json": {
              schema: ChannelResponse,
            },
          },
        },
        400: {
          description: "Invalid request parameters",
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
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: NotFoundResponse,
            },
          },
        },
      },
    },
    async (c) => {
      const { channelId } = c.req.valid("param");

      const channel = await db.query.channel.findFirst({
        where: eq(schema.channel.id, channelId),
        with: {
          subscriptions: {
            where: eq(schema.channelSubscription.userId, c.get("user").fid),
          },
        },
      });

      if (!channel) {
        return c.json({ error: "Channel not found" }, 404);
      }

      return c.json({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        isSubscribed: channel.subscriptions.length > 0,
        notificationsEnabled: channel.subscriptions.some(
          (sub) => sub.notificationsEnabled,
        ),
      });
    },
  );
}
