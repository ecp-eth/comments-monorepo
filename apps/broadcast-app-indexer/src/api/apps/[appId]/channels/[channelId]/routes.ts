import type { OpenAPIHono } from "@hono/zod-openapi";
import { channelGET } from "./get";
import { channelSubscriptionHEAD } from "./subscription/head";
import { channelSubscriptionPATCH } from "./subscription/patch";
import { channelNotificationsPUT } from "./notifications/put";

export async function initializeChannelRoutes(api: OpenAPIHono): Promise<void> {
  await channelGET(api);
  await channelSubscriptionPATCH(api);
  await channelNotificationsPUT(api);
  await channelSubscriptionHEAD(api);
}
