import type { OpenAPIHono } from "@hono/zod-openapi";
import { channelUnsubscribePOST } from "./unsubscribe/post";
import { channelSubscribePOST } from "./subscribe/post";
import { channelGET } from "./get";
import { channelSubscriptionPATCH } from "./subscription/patch";

export async function initializeChannelRoutes(api: OpenAPIHono): Promise<void> {
  await channelGET(api);
  await channelSubscribePOST(api);
  await channelUnsubscribePOST(api);
  await channelSubscriptionPATCH(api);
}
