import { type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  BadRequestResponse,
  ChannelResponse,
  type ChannelResponseInput,
  NotFoundResponse,
} from "../../../../shared-responses";
import {
  db,
  farcasterChannelNotificationSettingsLoader,
} from "../../../../../services";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../../middleware/siwe";

export async function channelGET(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "get",
      path: "/api/apps/:appId/channels/:channelId",
      tags: ["Channels"],
      description: "Get a channel by ID",
      middleware: siweMiddleware,
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
      const userAddress = c.get("user")!.address;

      const result = await db.query.channel.findFirst({
        with: {
          subscriptions: {
            where(fields, operators) {
              return operators.eq(fields.userAddress, userAddress);
            },
          },
        },
        where(fields, operators) {
          return operators.eq(fields.id, channelId);
        },
      });

      if (!result) {
        return c.json({ error: "Channel not found" }, 404);
      }

      const { subscriptions, ...channel } = result;
      const subscription = subscriptions[0];

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        ChannelResponse.parse({
          id: channel.id,
          chainId: channel.chainId,
          name: channel.name,
          description: channel.description,
          owner: channel.owner,
          createdAt: channel.createdAt,
          updatedAt: channel.updatedAt,
          isSubscribed: !!subscription,
          metadata: channel.metadata,
          // channel notification settings per farcaster client for this app
          notificationSettings:
            await farcasterChannelNotificationSettingsLoader.load({
              appId,
              channelId: channel.id,
              userAddress,
            }),
        } satisfies ChannelResponseInput),
        200,
      );
    },
  );
}
