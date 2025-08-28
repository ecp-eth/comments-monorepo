import type { Handler } from "hono";
import type { IAdminTelegramBotService } from "./types.ts";

export class NoopAdminBotService implements IAdminTelegramBotService {
  async initialize(): Promise<void> {
    // No operation for the noop service
    console.log("NoopAdminBotService: initialized");
  }

  handleWebhookRequest(): Handler {
    return async (c) => {
      return c.text("Noop Admin Bot Service");
    };
  }
}
