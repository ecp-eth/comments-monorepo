import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../../../middleware/farcaster-quick-auth-middleware";
import {
  BadRequestResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "../../../shared-responses";
import { db } from "../../../../services";
import { and, eq } from "drizzle-orm";
import { schema } from "../../../../../schema";

export async function channelUnsubscribePOST(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "post",
      path: "/api/channels/:channelId/unsubscribe",
      tags: ["Channels", "Subscriptions"],
      description: "Unsubscribes from a channel",
      middleware: [farcasterQuickAuthMiddleware] as const,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
        }),
      },
      responses: {
        204: {
          description: "Successfully unsubscribed from the channel",
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
          description: "Channel or subscription not found",
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

      const deletedSubscription = await db
        .delete(schema.channelSubscription)
        .where(
          and(
            eq(schema.channelSubscription.channelId, channelId),
            eq(schema.channelSubscription.userFid, c.get("user").fid),
          ),
        )
        .returning()
        .execute();

      if (!deletedSubscription) {
        return c.json({ error: "Subscription not found" }, 404);
      }

      return c.newResponse(null, 204);
    },
  );
}
