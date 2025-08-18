import type { OpenAPIHono } from "@hono/zod-openapi";
import { initializeChannelsRoutes } from "./apps/[appId]/channels/routes";
import { initializeSiweRoutes } from "./auth/siwe/routes";
import { initializeFarcasterRoutes } from "./apps/[appId]/farcaster/routes";

export async function initializeRoutes(api: OpenAPIHono): Promise<void> {
  await initializeChannelsRoutes(api);
  await initializeSiweRoutes(api);
  await initializeFarcasterRoutes(api);
}
