import type { OpenAPIHono } from "@hono/zod-openapi";
import { initializeChannelsRoutes } from "./channels/routes";

export async function initializeRoutes(api: OpenAPIHono): Promise<void> {
  await initializeChannelsRoutes(api);
}
