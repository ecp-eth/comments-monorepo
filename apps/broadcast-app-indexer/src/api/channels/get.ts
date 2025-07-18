import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { farcasterQuickAuthMiddleware } from "../middleware/farcaster-quick-auth-middleware";
import { schema } from "../../../schema";
import { db } from "../../services";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { ChannelResponse } from "../shared-responses";

function toChannelCursor(channel: { id: bigint; createdAt: Date }): string {
  return Buffer.from(
    `${channel.id.toString()}:${channel.createdAt.toISOString()}`,
  ).toString("base64url");
}

function fromChannelCursor(cursor: string): { id: bigint; createdAt: Date } {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");

  const [id, createdAt] = decoded.split(":");

  return z
    .object({
      id: z.coerce.bigint(),
      createdAt: z.coerce.date(),
    })
    .parse({
      id,
      createdAt,
    });
}

const requestQuerySchema = z.object({
  cursor: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;

      return fromChannelCursor(val);
    }),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  onlySubscribed: z
    .enum(["1", "0"])
    .transform((val) => val === "1")
    .default("0"),
});

const responseSchema = z.object({
  results: z.array(ChannelResponse),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
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
      const { limit, cursor, onlySubscribed } = c.req.valid("query");

      const results = await db.query.channel.findMany({
        with: {
          subscriptions: {
            where: eq(schema.channelSubscription.userFid, c.get("user").fid),
          },
        },
        where: and(
          onlySubscribed
            ? eq(schema.channelSubscription.userFid, c.get("user").fid)
            : undefined,
          cursor
            ? or(
                lt(schema.channel.createdAt, cursor.createdAt),
                and(
                  eq(schema.channel.createdAt, cursor.createdAt),
                  lt(schema.channel.id, cursor.id),
                ),
              )
            : undefined,
        ),
        orderBy: [desc(schema.channel.createdAt), desc(schema.channel.id)],
        limit: limit + 1,
      });

      const channels = results.slice(0, limit);
      const [nextCursor] = results.slice(limit);

      return c.json({
        results: channels.map((channel) => {
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
          hasNextPage: nextCursor !== undefined,
          nextCursor: nextCursor ? toChannelCursor(nextCursor) : undefined,
        },
      });
    },
  );
}
