import { renderToMarkdown } from "@ecp.eth/shared/renderer";
import type {
  IModerationNotificationsService,
  ModerationNotificationServicePendingComment,
  CommentModerationClassfierResult,
  CommentModerationLabelsWithScore,
  ModerationNotificationServiceNotifyPendingModerationParams,
  ModerationNotificationServiceNotifyAutomaticClassificationParams,
  ModerationNotificationsServiceCommentStatus,
  ITelegramNotificationsService,
} from "./types";
import type { CommentSelectType } from "ponder:schema";
import { isZeroHex, type Hex } from "@ecp.eth/sdk/core";
import { env } from "../env";

class CommentLengthLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentLengthLimitExceededError";
  }
}

type ModerationNotificationsServiceOptions = {
  enabled: boolean;
  telegramNotificationsService: ITelegramNotificationsService;
  resolveAuthor: (author: Hex) => Promise<string | Hex>;
};

export class ModerationNotificationsService
  implements IModerationNotificationsService
{
  private enabled: boolean;
  private telegramNotificationsService: ITelegramNotificationsService;
  private resolveAuthor: (author: Hex) => Promise<string | Hex>;

  constructor(options: ModerationNotificationsServiceOptions) {
    this.enabled = options.enabled;
    this.telegramNotificationsService = options.telegramNotificationsService;
    this.resolveAuthor = options.resolveAuthor;
  }

  async notifyPendingModeration(
    { comment }: ModerationNotificationServiceNotifyPendingModerationParams,
    status: ModerationNotificationsServiceCommentStatus,
  ) {
    if (!this.enabled) {
      console.log(
        "ModerationNotificationsService#notifyPendingModeration: disabled",
      );
      return;
    }

    try {
      const message = await this.renderNewPendingModerationMessage(
        comment,
        status,
      );

      const msg =
        await this.telegramNotificationsService.sendMessageWithWebhookActions(
          message,
          [
            {
              action: {
                action: "moderation-set-as-approved",
                commentId: comment.id,
                timestamp: Date.now(),
              },
              text: "Approve",
            },
            {
              action: {
                action: "moderation-set-as-rejected",
                commentId: comment.id,
                timestamp: Date.now(),
              },
              text: "Reject",
            },
          ],
        );

      return msg?.message_id;
    } catch (e) {
      if (e instanceof CommentLengthLimitExceededError) {
        return undefined;
      }

      console.error("ModerationNotificationsService: error sending message", e);

      throw e;
    }
  }

  async notifyAutomaticallyClassified({
    messageId,
    comment,
    classifierResult,
  }: ModerationNotificationServiceNotifyAutomaticClassificationParams) {
    if (!this.enabled) {
      console.log(
        "ModerationNotificationsService#notifyAutomaticallyClassified: disabled",
      );
      return;
    }

    try {
      const message = messageId
        ? await this.renderAutomaticClassificationMessageAsReply(
            classifierResult,
          )
        : await this.renderAutomaticClassificationMessageAsNewMessage(
            comment,
            classifierResult,
          );

      const msg = await this.telegramNotificationsService.sendMessage(message, {
        ...(messageId && {
          reply_parameters: {
            message_id: messageId,
          },
        }),
      });

      return msg?.message_id;
    } catch (e) {
      if (e instanceof CommentLengthLimitExceededError) {
        return;
      }

      console.error(
        "ModerationNotificationsService: error sending automatic classification message",
        e,
      );

      throw e;
    }
  }

  async updateMessageWithModerationStatus(
    messageId: number,
    comment: CommentSelectType,
  ) {
    if (!this.enabled) {
      console.log(
        "ModerationNotificationsService#updateMessageWithModerationStatus: disabled",
      );
      return;
    }

    try {
      const updatedMessage = await this.renderMessageContent(comment);

      await this.telegramNotificationsService.updateMessageWithWebhookActions(
        messageId,
        updatedMessage,
        [
          {
            action: {
              action: "moderation-change-status",
              commentId: comment.id,
              timestamp: Date.now(),
            },
            text: "Change",
          },
        ],
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
    if (!this.enabled) {
      console.log(
        "ModerationNotificationsService#updateMessageWithChangeAction: disabled",
      );
      return;
    }

    try {
      const updatedMessage = await this.renderMessageContent(comment);

      await this.telegramNotificationsService.updateMessageWithWebhookActions(
        messageId,
        updatedMessage,
        [
          {
            action: {
              action: "moderation-set-as-approved",
              commentId: comment.id,
              timestamp: Date.now(),
            },
            text: "Approve",
          },
          {
            action: {
              action: "moderation-set-as-pending",
              commentId: comment.id,
              timestamp: Date.now(),
            },
            text: "Pending",
          },
          {
            action: {
              action: "moderation-set-as-rejected",
              commentId: comment.id,
              timestamp: Date.now(),
            },
            text: "Reject",
          },
          {
            action: {
              action: "moderation-cancel",
              commentId: comment.id,
              timestamp: Date.now(),
            },
            text: "Cancel",
          },
        ],
      );
    } catch (e) {
      if (e instanceof CommentLengthLimitExceededError) {
        return;
      }

      console.error(
        "ModerationNotificationsService: error editing message with change action",
        e,
      );

      throw e;
    }
  }

  private async renderNewPendingModerationMessage(
    comment: ModerationNotificationServicePendingComment,
    status: ModerationNotificationsServiceCommentStatus,
  ): Promise<string> {
    const author = await this.resolveAuthor(comment.author);
    const message = `${status === "create" ? "🆕 New" : "🔄 Updated"} comment pending moderation

**ID**: \`${comment.id}\`
**Channel ID**: \`${comment.channelId}\`
**Author**: \`${author}\`
**Target**: \`${comment.targetUri}\`
**Parent ID**: \`${!comment.parentId || isZeroHex(comment.parentId) ? "None" : comment.parentId}\`

Content:

`;

    return this.renderWithLengthLimit(message, comment);
  }

  private async renderAutomaticClassificationMessageAsReply(
    classifierResult: CommentModerationClassfierResult,
  ): Promise<string> {
    const message = `🤖 Automatic classification result

**Classifier Score**: \`${(classifierResult.score * 100).toFixed(4)}%\`
**Classifier Labels**: 
${this.renderModerationClassifierResult(classifierResult.labels)}

`;

    return message;
  }

  private async renderAutomaticClassificationMessageAsNewMessage(
    comment: ModerationNotificationServicePendingComment,
    classifierResult: CommentModerationClassfierResult,
  ): Promise<string> {
    const author = await this.resolveAuthor(comment.author);
    const message = `🤖 Automatic classification result

**ID**: \`${comment.id}\`
**Channel ID**: \`${comment.channelId}\`
**Author**: \`${author}\`
**Target**: \`${comment.targetUri}\`
**Parent ID**: \`${!comment.parentId || isZeroHex(comment.parentId) ? "None" : comment.parentId}\`
**Classifier Score**: \`${(classifierResult.score * 100).toFixed(4)}%\`
**Classifier Labels**: 
${this.renderModerationClassifierResult(classifierResult.labels)}

Content:

`;

    return this.renderWithLengthLimit(message, comment);
  }

  private renderWithLengthLimit(
    message: string,
    comment: Pick<CommentSelectType, "content" | "references">,
  ): string {
    const remainingLength = env.TELEGRAM_MESSAGE_LENGTH_LIMIT - message.length;

    if (remainingLength <= 0) {
      console.error(
        "ModerationNotificationsService: message length limit exceeded",
        message,
      );

      throw new CommentLengthLimitExceededError(
        "Message length limit exceeded",
      );
    }

    const renderResult = renderToMarkdown({
      content: comment.content,
      references: comment.references,
      maxLength: remainingLength,
    });

    return message + renderResult.result;
  }

  private async renderMessageContent(
    comment: CommentSelectType,
  ): Promise<string> {
    const author = await this.resolveAuthor(comment.author);

    const status = this.resolveModerationStatus(comment.moderationStatus);

    const message = `${status.emoji} Comment ${status.text}

**ID**: \`${comment.id}\`
**Channel ID**: \`${comment.channelId}\`
**Author**: \`${author}\`
**Target**: \`${comment.targetUri}\`
**Parent ID**: \`${!comment.parentId || isZeroHex(comment.parentId) ? "None" : comment.parentId}\`
**Status**: ${status.emoji} ${status.text}

Content:

`;

    return this.renderWithLengthLimit(message, comment);
  }

  private renderModerationClassifierResult(
    moderationClassifierResult: CommentModerationLabelsWithScore,
  ) {
    return Object.entries(moderationClassifierResult)
      .map(
        ([label, score]) =>
          `- ${label.replace(/_/g, " ")} (${(score * 100).toFixed(4)}%)`,
      )
      .join("\n");
  }

  private resolveModerationStatus(
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
}
