import type { OpenAPIHono } from "@hono/zod-openapi";
import { channelUnsubscribePOST } from "./unsubscribe/post";
import { channelSubscribePOST } from "./subscribe/post";

export async function initializeChannelRoutes(api: OpenAPIHono): Promise<void> {
  await channelSubscribePOST(api);
  await channelUnsubscribePOST(api);
}
