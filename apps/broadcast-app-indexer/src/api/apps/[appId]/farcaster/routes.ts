import type { OpenAPIHono } from "@hono/zod-openapi";
import { farcasterSettingsPUT } from "./settings/put";

export async function initializeFarcasterRoutes(
  api: OpenAPIHono,
): Promise<void> {
  await farcasterSettingsPUT(api);
}
