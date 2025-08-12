import type {
  IReportsNotificationsService,
  ITelegramNotificationsService,
  ReportsNotificationsServiceNotifyReportParams,
  ReportsNotificationsServiceNotifyReportStatusChangeParams,
} from "./types";
import type { CommentSelectType } from "ponder:schema";
import type { Hex } from "viem";
import type { CommentReportSelectType } from "../../schema.offchain";

type ReportsNotificationServiceOptions = {
  enabled: boolean;
  telegramNotificationsService: ITelegramNotificationsService;
  resolveAuthor: (author: Hex) => Promise<string | Hex>;
};

export class ReportsNotificationsService
  implements IReportsNotificationsService
{
  private enabled: boolean;
  private telegramNotificationsService: ITelegramNotificationsService;
  private resolveAuthor: (author: Hex) => Promise<string | Hex>;

  constructor(options: ReportsNotificationServiceOptions) {
    this.enabled = options.enabled;
    this.telegramNotificationsService = options.telegramNotificationsService;
    this.resolveAuthor = options.resolveAuthor;
  }

  async notifyReportCreated({
    comment,
    report,
  }: ReportsNotificationsServiceNotifyReportParams) {
    if (!this.enabled) {
      console.log("ReportsNotificationsService#notifyReportCreated: disabled");
      return;
    }

    try {
      const message = await this.renderReportMessage(comment, report);

      const msg =
        await this.telegramNotificationsService.sendMessageWithWebhookActions(
          message,
          [
            {
              action: {
                action: "report-set-as-resolved",
                reportId: report.id,
                timestamp: Date.now(),
              },
              text: "Resolve",
            },
            {
              action: {
                action: "report-set-as-closed",
                reportId: report.id,
                timestamp: Date.now(),
              },
              text: "Close",
            },
          ],
        );

      return msg?.message_id;
    } catch (e) {
      console.error("ReportsNotificationsService: error sending message", e);

      throw e;
    }
  }

  async notifyReportStatusChanged({
    messageId,
    comment,
    report,
    callbackQuery,
  }: ReportsNotificationsServiceNotifyReportStatusChangeParams) {
    if (!this.enabled) {
      console.log(
        "ReportsNotificationsService#notifyReportStatusChanged: disabled",
      );
      return;
    }

    try {
      const message = await this.renderReportUpdateMessage(comment, report);

      await this.telegramNotificationsService.updateMessageWithWebhookActions(
        messageId,
        message,
        [
          {
            action: {
              action: "report-change-status",
              reportId: report.id,
              timestamp: Date.now(),
            },
            text: "Change status",
          },
        ],
      );

      if (callbackQuery) {
        await this.telegramNotificationsService.answerCallbackQueryWithSuccess(
          callbackQuery.id,
          "Report status updated",
        );
      }
    } catch (e) {
      console.error("ReportsNotificationsService: error sending message", e);

      if (callbackQuery) {
        await this.telegramNotificationsService.answerCallbackQueryWithError(
          callbackQuery.id,
          "Error editing message",
        );
      }

      throw e;
    }
  }

  private async renderReportMessage(
    comment: CommentSelectType,
    report: CommentReportSelectType,
  ) {
    const author = await this.resolveAuthor(report.reportee);

    let formattedMessage = `🆕 New report for comment

Report ID: ${report.id}
Comment ID: ${comment.id}
Author: ${author}`.trim();

    if (report.message) {
      formattedMessage += `\n\nMessage:\n\n${report.message}`;
    }

    return formattedMessage;
  }

  private async renderReportUpdateMessage(
    comment: CommentSelectType,
    report: CommentReportSelectType,
  ) {
    const author = await this.resolveAuthor(report.reportee);

    let formattedMessage = `🔄 Updated report for comment

Report ID: ${report.id}
Comment ID: ${comment.id}
Author: ${author}`.trim();

    if (report.message) {
      formattedMessage += `\n\nMessage:\n\n${report.message}`;
    }

    formattedMessage += `\n\nStatus: ${report.status}`;

    return formattedMessage;
  }
}
