import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../../middleware/farcaster-quick-auth-middleware";
import {
  BadRequestResponse,
  ChannelResponse,
  NotFoundResponse,
} from "../../shared-responses";
import { db } from "../../../services";
import { and, eq } from "drizzle-orm";
import { schema } from "../../../../schema";
import { HexSchema } from "@ecp.eth/sdk/core";

export async function channelGET(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "get",
      path: "/api/apps/:appId/channels/:channelId",
      tags: ["Channels"],
      description: "Get a channel by ID",
      middleware: [farcasterQuickAuthMiddleware] as const,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
          appId: HexSchema,
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
      const { channelId, appId } = c.req.valid("param");

      const [result] = await db
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
        .where(eq(schema.channel.id, channelId))
        .limit(1);

      if (!result) {
        return c.json({ error: "Channel not found" }, 404);
      }

      const { channel, channel_subscription } = result;

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        ChannelResponse.parse({
          id: channel.id,
          name: channel.name,
          description: channel.description,
          owner: channel.owner,
          createdAt: channel.createdAt,
          updatedAt: channel.updatedAt,
          isSubscribed: !!channel_subscription,
          notificationsEnabled:
            channel_subscription?.notificationsEnabled ?? false,
        }),
        200,
      );
    },
  );
}
