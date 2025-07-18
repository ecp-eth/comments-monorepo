import type { OpenAPIHono } from "@hono/zod-openapi";
import { telegramAdminBotService } from "../../../services";

export function setupAdminBotWebhook(app: OpenAPIHono) {
  app.post("/api/webhook/bot", telegramAdminBotService.handleWebhookRequest);

  return app;
}
