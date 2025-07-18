import type { OpenAPIHono } from "@hono/zod-openapi";
import { initializeChannelRoutes } from "./channels/routes";

export async function initializeRoutes(api: OpenAPIHono): Promise<void> {
  await initializeChannelRoutes(api);
}
