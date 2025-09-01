import type { OpenAPIHono } from "@hono/zod-openapi";
import { channelGET } from "./get";
import { channelFarcasterNotificationsPUT } from "./farcaster/notifications/put";

export async function initializeChannelRoutes(api: OpenAPIHono): Promise<void> {
  await channelGET(api);
  await channelFarcasterNotificationsPUT(api);
}
