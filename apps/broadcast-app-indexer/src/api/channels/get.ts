import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../middleware/farcaster-quick-auth-middleware";
import { schema } from "../../../schema";
import { db } from "../../services";
import { desc, eq } from "drizzle-orm";
import { ChannelResponse } from "../shared-responses";

const requestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const responseSchema = z.object({
  results: z.array(ChannelResponse),
  pageInfo: z.object({
    page: z.number().int().positive(),
    total: z.number().int().min(0),
  }),
});

export async function channelsGET(api: OpenAPIHono) {
  api.openapi(
    {
      method: "get",
      path: "/api/channels",
      tags: ["Channels"],
      description: "Get a list of channels",
      middleware: [farcasterQuickAuthMiddleware] as const,
      request: {
        query: requestQuerySchema,
      },
      responses: {
        200: {
          description: "List of available channels",
          content: {
            "application/json": {
              schema: responseSchema,
            },
          },
        },
      },
    },
    async (c) => {
      const { limit, page } = c.req.valid("query");

      const total = await db.$count(schema.channel);
      const result = await db.query.channel.findMany({
        with: {
          subscriptions: {
            where: eq(schema.channelSubscription.userFid, c.get("user").fid),
          },
        },
        orderBy: [desc(schema.channel.createdAt)],
        offset: (page - 1) * limit,
        limit,
      });

      return c.json({
        results: result.map((channel) => {
          return {
            id: channel.id,
            name: channel.name,
            description: channel.description,
            isSubscribed: channel.subscriptions.length > 0,
            notificationsEnabled: channel.subscriptions.some(
              (sub) => sub.notificationsEnabled,
            ),
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt,
          };
        }),
        pageInfo: {
          total,
          page,
        },
      });
    },
  );
}
