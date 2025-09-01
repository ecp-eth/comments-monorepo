import type { OpenAPIHono } from "@hono/zod-openapi";
import { channelsGET } from "./get";
import { initializeChannelRoutes } from "./[channelId]/routes";

export async function initializeChannelsRoutes(
  api: OpenAPIHono,
): Promise<void> {
  await channelsGET(api);
  await initializeChannelRoutes(api);
}
