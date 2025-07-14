import { Telegraf } from "telegraf";
import type { ITelegramNotificationsService } from "./types";
import {
  decryptWebhookCallbackData,
  encryptWebhookCallbackData,
  type WebhookCallbackData,
} from "../utils/webhook";
import type { Convenience } from "telegraf/types";

type TelegramNotificationsServiceOptions =
  | {
      enabled: true;
      telegramBotToken: string;
      telegramChannelId: string;
      telegramWebhookUrl: string;
      telegramWebhookSecret: string;
    }
  | {
      enabled: false;
    };

export class TelegramNotificationsService
  implements ITelegramNotificationsService
{
  private state:
    | {
        enabled: true;
        bot: Telegraf;
        channelId: string;
        telegramWebhookUrl: string;
        telegramWebhookSecret: string;
      }
    | {
        enabled: false;
      };

  constructor(options: TelegramNotificationsServiceOptions) {
    if (options.enabled) {
      this.state = {
        enabled: true,
        bot: new Telegraf(options.telegramBotToken),
        channelId: options.telegramChannelId,
        telegramWebhookUrl: options.telegramWebhookUrl,
        telegramWebhookSecret: options.telegramWebhookSecret,
      };
    } else {
      this.state = {
        enabled: false,
      };
    }
  }

  async initialize() {
    if (this.state.enabled) {
      await this.state.bot.telegram.setWebhook(this.state.telegramWebhookUrl);
    } else {
      console.log("TelegramNotificationsService: disabled");
    }
  }

  encryptWebhookCallbackData(data: WebhookCallbackData) {
    if (!this.state.enabled) {
      throw new Error("TelegramNotificationsService: disabled");
    }

    return encryptWebhookCallbackData(this.state.telegramWebhookSecret, data);
  }

  decryptWebhookCallbackData(data: string) {
    if (!this.state.enabled) {
      throw new Error("TelegramNotificationsService: disabled");
    }

    return decryptWebhookCallbackData(this.state.telegramWebhookSecret, data);
  }

  async sendMessage(message: string, extra?: Convenience.ExtraReplyMessage) {
    if (!this.state.enabled) {
      console.log("TelegramNotificationsService: disabled");
      return;
    }

    return await this.state.bot.telegram.sendMessage(
      this.state.channelId,
      message,
      {
        parse_mode: "Markdown",
        link_preview_options: {
          is_disabled: true,
        },
        ...extra,
      },
    );
  }

  async sendMessageWithWebhookActions(
    message: string,
    actions: {
      action: WebhookCallbackData;
      text: string;
    }[],
    extra?: Omit<Convenience.ExtraReplyMessage, "reply_markup">,
  ) {
    if (!this.state.enabled) {
      console.log("TelegramNotificationsService: disabled");
      return;
    }

    const msg = await this.state.bot.telegram.sendMessage(
      this.state.channelId,
      message,
      {
        parse_mode: "Markdown",
        link_preview_options: {
          is_disabled: true,
        },
        reply_markup: {
          inline_keyboard: actions.map((action) => [
            {
              callback_data: this.encryptWebhookCallbackData(action.action),
              text: action.text,
            },
          ]),
        },
        ...extra,
      },
    );

    return msg;
  }

  async updateMessageWithWebhookActions(
    messageId: number,
    message: string,
    actions: {
      action: WebhookCallbackData;
      text: string;
    }[],
    extra?: Omit<Convenience.ExtraEditMessageText, "inline_keyboard">,
  ) {
    if (!this.state.enabled) {
      console.log("TelegramNotificationsService: disabled");
      return;
    }

    await this.state.bot.telegram.editMessageText(
      this.state.channelId,
      messageId,
      undefined,
      message,
      {
        parse_mode: "Markdown",
        link_preview_options: {
          is_disabled: true,
        },
        reply_markup: {
          inline_keyboard: actions.map((action) => [
            {
              callback_data: this.encryptWebhookCallbackData(action.action),
              text: action.text,
            },
          ]),
        },
        ...extra,
      },
    );
  }
}
