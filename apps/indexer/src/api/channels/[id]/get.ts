import { db } from "ponder:api";
import schema from "ponder:schema";
import { eq } from "ponder";
import { IndexerAPIChannelOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  GetChannelParamsSchema,
} from "../../../lib/schemas";

const getChannelRoute = createRoute({
  method: "get",
  path: "/api/channels/{channelId}",
  tags: ["channels"],
  description: "Retrieve a channel by ID",
  request: {
    params: GetChannelParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIChannelOutputSchema,
        },
      },
      description: "Retrieve a list of channels",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "Channel not found",
    },
  },
});

/**
 * Setup Channels API
 *
 * @param app - The Hono app instance
 * @returns hono app instance
 */
export function setupGetChannel(app: OpenAPIHono) {
  app.openapi(getChannelRoute, async (c) => {
    const { channelId } = c.req.valid("param");

    const channel = await db.query.channel.findFirst({
      where: eq(schema.channel.id, channelId),
    });

    if (!channel) {
      return c.json(
        {
          message: "Channel not found",
        },
        404,
      );
    }

    return c.json(IndexerAPIChannelOutputSchema.parse(channel), 200);
  });

  return app;
}
