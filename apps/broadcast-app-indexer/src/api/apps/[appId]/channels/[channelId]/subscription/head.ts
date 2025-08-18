import { type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  InternalServerErrorResponse,
  NotFoundResponse,
} from "../../../../../shared-responses";
import { db } from "../../../../../../services";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../../../middleware/siwe";

export async function channelSubscriptionHEAD(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "head",
      path: "/api/apps/:appId/channels/:channelId/subscription",
      tags: ["Channels", "Subscriptions"],
      description: "Gets subscription for a channel",
      middleware: siweMiddleware,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
          appId: HexSchema,
        }),
      },
      responses: {
        204: {
          description: "Subscription exists",
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
      const { channelId } = c.req.valid("param");

      const subscription = await db.query.channelSubscription.findFirst({
        where(table, { and, eq }) {
          return and(
            eq(table.channelId, channelId),
            eq(table.userAddress, c.get("user")!.address),
          );
        },
      });

      if (subscription) {
        return c.newResponse(null, 204);
      }

      return c.json(
        {
          error: "No subscription found",
        },
        404,
      );
    },
  );
}
