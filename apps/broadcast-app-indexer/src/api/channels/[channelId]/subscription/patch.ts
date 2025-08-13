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
import { and, eq } from "drizzle-orm";

export async function channelSubscriptionPATCH(
  api: OpenAPIHono,
): Promise<void> {
  api.openapi(
    {
      method: "patch",
      path: "/api/channels/[channelId]/subscription",
      tags: ["Channels", "Subscriptions"],
      description: "Updates subscription settings for a channel",
      middleware: [farcasterQuickAuthMiddleware] as const,
      request: {
        params: z.object({
          channelId: z.coerce.bigint(),
        }),
        body: {
          content: {
            "application/json": {
              schema: z.object({
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
      const { channelId } = c.req.valid("param");

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

      const [subscription] = await db
        .update(schema.channelSubscription)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.channelSubscription.channelId, channelId),
            eq(schema.channelSubscription.userId, c.get("user").fid),
          ),
        )
        .returning()
        .execute();

      if (!subscription) {
        return c.json({ error: "Subscription not found" }, 404);
      }

      return c.json(
        {
          channelId: subscription.channelId,
          notificationsEnabled: subscription.notificationsEnabled,
        },
        200,
      );
    },
  );
}
