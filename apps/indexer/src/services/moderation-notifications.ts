import { Telegraf } from "telegraf";
import { renderToMarkdown } from "@ecp.eth/shared/renderer";
import type {
  ModerationNotificationsService as ModerationNotificationsServiceInterface,
  ModerationNotificationServicePendingComment,
  CommentModerationClassfierResult,
} from "./types";
import {
  decryptWebhookCallbackData,
  encryptWebhookCallbackData,
} from "../utils/webhook";
import type { CommentSelectType } from "ponder:schema";
import { isZeroHex, type Hex } from "@ecp.eth/sdk/core";
import { ensByAddressResolverService } from "./ens-by-address-resolver";
import { farcasterByAddressResolverService } from "./farcaster-by-address-resolver";
import { env } from "process";

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
    classifierResult: CommentModerationClassfierResult,
  ) {
    const author = await resolveAuthor(comment.author);
    let message = `🆕 New comment pending moderation

**ID**: \`${comment.id}\`
**Channel ID**: \`${comment.channelId}\`
**Author**: \`${author}\`
**Target**: \`${comment.targetUri}\`
**Parent ID**: \`${!comment.parentId || isZeroHex(comment.parentId) ? "None" : comment.parentId}\`
**Classifier Score**: \`${(classifierResult.score * 100).toFixed(4)}%\`
**Classifier Labels**: 
\`${classifierResult.labels.map((l) => `- ${l.label} (${(l.score * 100).toFixed(4)}%)`).join("\n")}\`

Content:

`;

    const remainingLength = env.TELEGRAM_MESSAGE_LENGTH_LIMIT - message.length;
    if (remainingLength <= 0) {
      console.error(
        "ModerationNotificationsService: message length limit exceeded too early, not enough remaining length for the message",
        message,
      );

      return;
    }

    const renderResult = renderToMarkdown({
      content: comment.content,
      references: comment.references,
      maxLength: remainingLength,
    });

    message += renderResult.result;

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
    comment: CommentSelectType,
  ) {
    const updatedMessage = await renderMessageContent(comment);

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
            inline_keyboard: [
              [
                {
                  callback_data: encryptWebhookCallbackData(
                    this.telegramWebhookSecret,
                    {
                      action: "change",
                      commentId: comment.id,
                      timestamp: Date.now(),
                    },
                  ),
                  text: "Change",
                },
              ],
            ],
          },
        },
      );
    } catch (e) {
      console.error("ModerationNotificationsService: error editing message", e);

      throw e;
    }
  }

  async updateMessageWithChangeAction(
    messageId: number,
    comment: CommentSelectType,
  ) {
    const updatedMessage = await renderMessageContent(comment);

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
                      action: "pending",
                      commentId: comment.id,
                      timestamp: Date.now(),
                    },
                  ),
                  text: "Pending",
                },
              ],
              [
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
                {
                  callback_data: encryptWebhookCallbackData(
                    this.telegramWebhookSecret,
                    {
                      action: "cancel",
                      commentId: comment.id,
                      timestamp: Date.now(),
                    },
                  ),
                  text: "Cancel",
                },
              ],
            ],
          },
        },
      );
    } catch (e) {
      console.error(
        "ModerationNotificationsService: error editing message with change action",
        e,
      );

      throw e;
    }
  }

  decryptWebhookCallbackData(data: string) {
    return decryptWebhookCallbackData(this.telegramWebhookSecret, data);
  }
}

async function renderMessageContent(
  comment: CommentSelectType,
): Promise<string> {
  const author = await resolveAuthor(comment.author);
  const renderResult = renderToMarkdown({
    content: comment.content,
    references: comment.references,
  });

  const status = resolveModerationStatus(comment.moderationStatus);

  return `
  ${status.emoji} Comment ${status.text}

**ID**: \`${comment.id}\`
**Channel ID**: \`${comment.channelId}\`
**Author**: \`${author}\`
**Target**: \`${comment.targetUri}\`
**Parent ID**: \`${!comment.parentId || isZeroHex(comment.parentId) ? "None" : comment.parentId}\`
**Status**: ${status.emoji} ${status.text}
**Classifier Score**: \`${(comment.moderationClassifierScore * 100).toFixed(4)}%\`
**Classifier Labels**: 
\`${comment.moderationClassifierResult.map((l) => `- ${l.label} (${(l.score * 100).toFixed(4)}%)`).join("\n")}\`

Content:

${renderResult.result}
`.trim();
}

function resolveModerationStatus(
  moderationStatus: CommentSelectType["moderationStatus"],
): {
  emoji: string;
  text: string;
} {
  switch (moderationStatus) {
    case "approved":
      return { emoji: "✅", text: "Approved" };
    case "rejected":
      return { emoji: "❌", text: "Rejected" };
    case "pending":
      return { emoji: "⏳", text: "Pending" };
    default:
      return { emoji: "❓", text: "Unknown" };
  }
}
