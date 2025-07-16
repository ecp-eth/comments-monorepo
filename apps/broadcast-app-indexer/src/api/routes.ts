import type { OpenAPIHono } from "@hono/zod-openapi";
import { channelsGET } from "./channels/get";

export async function initializeRoutes(api: OpenAPIHono): Promise<void> {
  await channelsGET(api);
}
