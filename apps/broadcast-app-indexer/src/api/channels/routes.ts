import type { OpenAPIHono } from "@hono/zod-openapi";
import { channelsGET } from "./get";

export async function initializeChannelRoutes(api: OpenAPIHono): Promise<void> {
  await channelsGET(api);
  await initializeChannelRoutes(api);
}
