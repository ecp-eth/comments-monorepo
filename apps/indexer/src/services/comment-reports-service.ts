import type { Hex } from "@ecp.eth/sdk/core";
import type {
  ICommentReportsService,
  IReportsNotificationsService,
  TelegramCallbackQuery,
} from "./types";
import type { CommentReportStatus } from "../management/types";
import type { DB } from "./db";
import { desc, eq } from "drizzle-orm";
import { schema } from "../../schema";
import type { CommentSelectType } from "ponder:schema";
import type { CommentReportSelectType } from "../../schema.offchain";
import {
  CommentNotFoundError,
  ReportNotFoundError,
  ReportStatusAlreadySetError,
} from "./errors";

type CommentReportsServiceOptions = {
  notificationService: IReportsNotificationsService;
  db: DB;
};

export class CommentReportsService implements ICommentReportsService {
  private notificationService: IReportsNotificationsService;
  private db: DB;

  constructor(options: CommentReportsServiceOptions) {
    this.notificationService = options.notificationService;
    this.db = options.db;
  }

  /**
   * Get a report by comment ID
   * @param reportId The ID of the report to get
   * @returns The report if it exists, undefined otherwise
   */
  async getReportById(
    reportId: string,
  ): Promise<CommentReportSelectType | undefined> {
    const report = await this.db.query.commentReports.findFirst({
      where: eq(schema.commentReports.id, reportId),
    });

    return report;
  }

  /**
   * Get a pending report
   * This method retrieves the most recent pending report from the database.
   * @returns A pending report if it exists, undefined otherwise
   */
  async getPendingReport(): Promise<CommentReportSelectType | undefined> {
    const pendingReport = await this.db.query.commentReports.findFirst({
      where: eq(schema.commentReports.status, "pending"),
      orderBy: desc(schema.commentReports.createdAt),
    });

    return pendingReport;
  }

  async report({
    commentId,
    reportee,
    message,
  }: {
    commentId: Hex;
    reportee: Hex;
    message: string | undefined;
  }): Promise<void> {
    const comment = await this.getCommentById(commentId);

    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }

    const report = await this.insertReport(commentId, reportee, message ?? "");

    await this.notificationService.notifyReportCreated({
      comment,
      report,
    });
  }

  async changeStatus({
    reportId,
    status,
    callbackQuery,
  }: {
    reportId: string;
    status: CommentReportStatus;
    callbackQuery?: TelegramCallbackQuery;
  }): Promise<CommentReportSelectType> {
    const report = await this.getReportById(reportId);

    if (!report) {
      throw new ReportNotFoundError(reportId, callbackQuery);
    }

    if (report.status === status) {
      throw new ReportStatusAlreadySetError(reportId, status, callbackQuery);
    }

    const comment = await this.getCommentById(report.commentId);

    if (!comment) {
      throw new CommentNotFoundError(report.commentId, callbackQuery);
    }

    const updatedReport = await this.updateReportStatus(reportId, status);

    if (callbackQuery) {
      await this.notificationService.notifyReportStatusChanged({
        messageId: callbackQuery.message.message_id,
        comment,
        report: updatedReport,
        callbackQuery,
      });
    }

    return updatedReport;
  }

  async cancelStatusChange(
    reportId: string,
    callbackQuery?: TelegramCallbackQuery,
  ): Promise<CommentReportSelectType> {
    const report = await this.getReportById(reportId);

    if (!report) {
      throw new ReportNotFoundError(reportId, callbackQuery);
    }

    const comment = await this.getCommentById(report.commentId);

    if (!comment) {
      throw new CommentNotFoundError(report.commentId, callbackQuery);
    }

    if (callbackQuery) {
      await this.notificationService.notifyReportStatusChangeCancelled({
        comment,
        messageId: callbackQuery.message.message_id,
        report,
        callbackQuery,
      });
    }

    return report;
  }

  async requestStatusChange(
    reportId: string,
    callbackQuery?: TelegramCallbackQuery,
  ): Promise<CommentReportSelectType> {
    const report = await this.getReportById(reportId);

    if (!report) {
      throw new ReportNotFoundError(reportId, callbackQuery);
    }

    const comment = await this.getCommentById(report.commentId);

    if (!comment) {
      throw new CommentNotFoundError(report.commentId, callbackQuery);
    }

    if (callbackQuery) {
      await this.notificationService.notifyReportStatusChangeRequested({
        messageId: callbackQuery.message.message_id,
        comment,
        report,
        callbackQuery,
      });
    }

    return report;
  }

  private async getCommentById(
    commentId: Hex,
  ): Promise<CommentSelectType | undefined> {
    return this.db.query.comment.findFirst({
      where: eq(schema.comment.id, commentId),
    });
  }

  /**
   * Report a comment with a message
   *
   * @param commentId The ID of the comment to report
   * @param reportee The address of the user reporting the comment
   * @param message Optional message explaining the report
   */
  private async insertReport(
    commentId: Hex,
    reportee: Hex,
    message: string,
  ): Promise<CommentReportSelectType> {
    return await this.db.transaction(async (tx) => {
      const comment = await tx.query.comment.findFirst({
        where: eq(schema.comment.id, commentId),
      });

      if (!comment) {
        throw new CommentNotFoundError(commentId);
      }

      const [result] = await tx
        .insert(schema.commentReports)
        .values({
          commentId: comment.id,
          reportee,
          message,
          status: "pending",
        })
        .returning()
        .execute();

      if (!result) {
        throw new Error("Failed to insert report");
      }

      return result;
    });
  }

  /**
   * Update the status of a report
   *
   * @param reportId The ID of the report to update
   * @param status The new status of the report
   */
  private async updateReportStatus(
    reportId: string,
    status: CommentReportStatus,
  ): Promise<CommentReportSelectType> {
    const [result] = await this.db
      .update(schema.commentReports)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.commentReports.id, reportId))
      .returning()
      .execute();

    if (!result) {
      throw new ReportNotFoundError(reportId);
    }

    return result;
  }
}
