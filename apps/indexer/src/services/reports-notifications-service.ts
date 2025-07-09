import type {
  IReportsNotificationsService,
  ITelegramNotificationsService,
  ReportsNotificationsServiceNotifyReportParams,
  ReportsNotificationsServiceNotifyReportStatusChangeParams,
} from "./types";
import type { CommentSelectType } from "ponder:schema";
import type { Hex } from "viem";
import type { CommentReportSelectType } from "../management/migrations";

type ReportsNotificationServiceOptions = {
  telegramNotificationsService: ITelegramNotificationsService;
  resolveAuthor: (author: Hex) => Promise<string | Hex>;
};

export class ReportsNotificationsService
  implements IReportsNotificationsService
{
  private telegramNotificationsService: ITelegramNotificationsService;
  private resolveAuthor: (author: Hex) => Promise<string | Hex>;

  constructor(options: ReportsNotificationServiceOptions) {
    this.telegramNotificationsService = options.telegramNotificationsService;
    this.resolveAuthor = options.resolveAuthor;
  }

  async notifyReportCreated({
    comment,
    report,
  }: ReportsNotificationsServiceNotifyReportParams) {
    try {
      const message = await this.renderReportMessage(comment, report);

      const msg =
        await this.telegramNotificationsService.sendMessageWithWebhookActions(
          message,
          [
            {
              action: {
                action: "report-set-as-resolved",
                reportId: comment.id,
                timestamp: Date.now(),
              },
              text: "Resolve",
            },
            {
              action: {
                action: "report-set-as-closed",
                reportId: comment.id,
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
  }: ReportsNotificationsServiceNotifyReportStatusChangeParams) {
    try {
      const message = await this.renderReportUpdateMessage(comment, report);

      await this.telegramNotificationsService.updateMessageWithWebhookActions(
        messageId,
        message,
        [
          {
            action: {
              action: "report-change-status",
              reportId: comment.id,
              timestamp: Date.now(),
            },
            text: "Change status",
          },
        ],
      );
    } catch (e) {
      console.error("ReportsNotificationsService: error sending message", e);

      throw e;
    }
  }

  private async renderReportMessage(
    comment: CommentSelectType,
    report: CommentReportSelectType,
  ) {
    const author = await this.resolveAuthor(report.reportee);

    let formattedMessage = `🆕 New report for comment ${comment.id} by ${author}`;

    if (report.message) {
      formattedMessage += `\n\nMessage: ${report.message}`;
    }

    return formattedMessage;
  }

  private async renderReportUpdateMessage(
    comment: CommentSelectType,
    report: CommentReportSelectType,
  ) {
    const author = await this.resolveAuthor(report.reportee);

    let formattedMessage = `🔄 Updated report for comment ${comment.id} by ${author}`;

    if (report.message) {
      formattedMessage += `\n\nMessage: ${report.message}`;
    }

    formattedMessage += `\n\nStatus: ${report.status}`;

    return formattedMessage;
  }
}
