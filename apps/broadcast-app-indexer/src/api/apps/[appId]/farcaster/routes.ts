import type { OpenAPIHono } from "@hono/zod-openapi";
import { farcasterSettingsPUT } from "./[clientFid]/settings/put";

export async function initializeFarcasterRoutes(
  api: OpenAPIHono,
): Promise<void> {
  await farcasterSettingsPUT(api);
}
