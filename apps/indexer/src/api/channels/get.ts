import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, gte, lt, lte, or } from "ponder";
import { IndexerAPIListChannelsOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { GetChannelsQuerySchema } from "../../lib/schemas";
import { getChannelCursor } from "@ecp.eth/sdk/indexer";

const getChannelsRoute = createRoute({
  method: "get",
  path: "/api/channels",
  tags: ["channels"],
  description: "Retrieve a list of channels based on the criteria",
  request: {
    query: GetChannelsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIListChannelsOutputSchema,
        },
      },
      description: "Retrieve a list of channels",
    },
  },
});

/**
 * Setup Channels API
 *
 * @param app - The Hono app instance
 * @returns hono app instance
 */
export function setupGetChannels(app: OpenAPIHono) {
  app.openapi(getChannelsRoute, async (c) => {
    const { sort, limit, cursor, owner } = c.req.valid("query");

    const hasPreviousChannelsQuery = cursor
      ? db.query.channel
          .findFirst({
            where: and(
              ...(owner ? [eq(schema.channel.owner, owner)] : []),
              // use opposite order for asc and desc
              ...(sort === "asc"
                ? [
                    or(
                      and(
                        eq(schema.channel.createdAt, cursor.createdAt),
                        lte(schema.channel.id, cursor.id),
                      ),
                      lt(schema.channel.createdAt, cursor.createdAt),
                    ),
                  ]
                : []),
              ...(sort === "desc"
                ? [
                    or(
                      and(
                        eq(schema.channel.createdAt, cursor.createdAt),
                        gte(schema.channel.id, cursor.id),
                      ),
                      gt(schema.channel.createdAt, cursor.createdAt),
                    ),
                  ]
                : []),
            ),
            orderBy:
              sort === "desc"
                ? [asc(schema.channel.createdAt), asc(schema.channel.id)]
                : [desc(schema.channel.createdAt), desc(schema.channel.id)],
          })
          .execute()
      : undefined;

    const channelsQuery = db.query.channel.findMany({
      where: and(
        ...(owner ? [eq(schema.channel.owner, owner)] : []),
        ...(sort === "desc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.channel.createdAt, cursor.createdAt),
                  lt(schema.channel.id, cursor.id),
                ),
                lt(schema.channel.createdAt, cursor.createdAt),
              ),
            ]
          : []),
        ...(sort === "asc" && !!cursor
          ? [
              or(
                and(
                  eq(schema.channel.createdAt, cursor.createdAt),
                  gt(schema.channel.id, cursor.id),
                ),
                gt(schema.channel.createdAt, cursor.createdAt),
              ),
            ]
          : []),
      ),
      orderBy:
        sort === "desc"
          ? [desc(schema.channel.createdAt), desc(schema.channel.id)]
          : [asc(schema.channel.createdAt), asc(schema.channel.id)],
      limit: limit + 1,
    });

    const [channels, previousChannel] = await Promise.all([
      channelsQuery,
      hasPreviousChannelsQuery,
    ]);

    const nextChannel = channels[channels.length - 1];
    const results = channels.slice(0, limit);
    const startChannel = results[0];
    const endChannel = results[results.length - 1];

    return c.json(
      IndexerAPIListChannelsOutputSchema.parse({
        results,
        pagination: {
          limit,
          hasNext: nextChannel !== endChannel,
          hasPrevious: !!previousChannel,
          startCursor: startChannel
            ? getChannelCursor(startChannel.id, startChannel.createdAt)
            : undefined,
          endCursor: endChannel
            ? getChannelCursor(endChannel.id, endChannel.createdAt)
            : undefined,
        },
      }),
      200,
    );
  });

  return app;
}
