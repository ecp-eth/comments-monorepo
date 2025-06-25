import { Telegraf } from "telegraf";
import type {
  ModerationNotificationsService as ModerationNotificationsServiceInterface,
  ModerationNotificationServicePendingComment,
} from "./types";
import {
  decryptWebhookCallbackData,
  encryptWebhookCallbackData,
} from "../utils/webhook";
import type { CommentSelectType } from "ponder:schema";
import type { Hex } from "@ecp.eth/sdk/core";
import { ensByAddressResolverService } from "./ens-by-address-resolver";
import { farcasterByAddressResolverService } from "./farcaster-by-address-resolver";

type ModerationNotificationsServiceOptions = {
  telegramBotToken: string;
  telegramChannelId: string;
  telegramWebhookUrl: string;
  telegramWebhookSecret: string;
};

function resolveAuthor(author: Hex): Promise<string | Hex> {
  return ensByAddressResolverService.load(author).then((data) => {
    if (data) {
      return data.name;
    }

    return farcasterByAddressResolverService
      .load(author)
      .then((data) => data?.fname ?? author);
  });
}

export class ModerationNotificationsService
  implements ModerationNotificationsServiceInterface
{
  private bot: Telegraf;
  private channelId: string;
  private telegramWebhookUrl: string;
  private telegramWebhookSecret: string;

  constructor(options: ModerationNotificationsServiceOptions) {
    this.bot = new Telegraf(options.telegramBotToken);
    this.channelId = options.telegramChannelId;
    this.telegramWebhookUrl = options.telegramWebhookUrl;
    this.telegramWebhookSecret = options.telegramWebhookSecret;
  }

  async initialize() {
    try {
      await this.bot.telegram.setWebhook(this.telegramWebhookUrl);
    } catch (e) {
      console.error("ModerationNotificationsService: error setting webhook", e);

      throw e;
    }
  }

  async notifyPendingModeration(
    comment: ModerationNotificationServicePendingComment,
  ) {
    const author = await resolveAuthor(comment.author);
    const message = `🆕 New comment pending moderation

ID: \`${comment.id}\`
Author: \`${author}\`
Target: \`${comment.targetUri}\`

Content:

${comment.content}
`;

    try {
      await this.bot.telegram.sendMessage(this.channelId, message, {
        parse_mode: "Markdown",
        link_preview_options: {
          is_disabled: true,
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                callback_data: encryptWebhookCallbackData(
                  this.telegramWebhookSecret,
                  {
                    action: "approve",
                    commentId: comment.id,
                    timestamp: Date.now(),
                  },
                ),
                text: "Approve",
              },
              {
                callback_data: encryptWebhookCallbackData(
                  this.telegramWebhookSecret,
                  {
                    action: "reject",
                    commentId: comment.id,
                    timestamp: Date.now(),
                  },
                ),
                text: "Reject",
              },
            ],
          ],
        },
      });
    } catch (e) {
      console.error("ModerationNotificationsService: error sending message", e);

      throw e;
    }
  }

  async updateMessageWithModerationStatus(
    messageId: number,
    {
      author: authorAddress,
      id,
      content,
      moderationStatus,
      targetUri,
    }: CommentSelectType,
  ) {
    const author = await resolveAuthor(authorAddress);

    const statusEmoji = moderationStatus === "approved" ? "✅" : "❌";
    const statusText =
      moderationStatus === "approved" ? "Approved" : "Rejected";

    const updatedMessage = `${statusEmoji} Comment ${statusText}

ID: \`${id}\`
Author: \`${author}\`
Target: \`${targetUri}\`

Content:

${content}

**Status: ${statusText}**`;

    try {
      await this.bot.telegram.editMessageText(
        this.channelId,
        messageId,
        undefined,
        updatedMessage,
        {
          parse_mode: "Markdown",
          link_preview_options: {
            is_disabled: true,
          },
          reply_markup: {
            inline_keyboard: [], // Remove the action buttons
          },
        },
      );
    } catch (e) {
      console.error("ModerationNotificationsService: error editing message", e);

      throw e;
    }
  }

  decryptWebhookCallbackData(data: string) {
    return decryptWebhookCallbackData(this.telegramWebhookSecret, data);
  }
}
