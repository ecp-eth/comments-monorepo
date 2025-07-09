import type { Hex } from "@ecp.eth/sdk/core";
import type {
  ICommentDbService,
  ICommentReportsService,
  IReportsNotificationsService,
} from "./types";
import {
  CommentNotFoundError,
  ReportNotFoundError,
  ReportStatusAlreadySetError,
} from "./errors";
import { ManagementCommentDbService } from "../management/services/comment-db-service";
import type { CommentReportStatus } from "../management/types";

type CommentReportsServiceOptions = {
  commentDbService: ICommentDbService;
  managementCommentDbService: ManagementCommentDbService;
  notificationService: IReportsNotificationsService;
};

export class CommentReportsService implements ICommentReportsService {
  private commentDbService: ICommentDbService;
  private managementCommentDbService: ManagementCommentDbService;
  private notificationService: IReportsNotificationsService;

  constructor(options: CommentReportsServiceOptions) {
    this.commentDbService = options.commentDbService;
    this.managementCommentDbService = options.managementCommentDbService;
    this.notificationService = options.notificationService;
  }

  async report(commentId: Hex, reportee: Hex, message?: string): Promise<void> {
    const comment = await this.commentDbService.getCommentById(commentId);

    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }

    const report = await this.managementCommentDbService.insertReport(
      commentId,
      reportee,
      message,
    );

    await this.notificationService.notifyReportCreated({
      comment,
      report,
    });
  }

  async changeStatus(
    messageId: number,
    reportId: Hex,
    status: CommentReportStatus,
  ): Promise<void> {
    const report =
      await this.managementCommentDbService.getReportById(reportId);

    if (!report) {
      throw new ReportNotFoundError(reportId);
    }

    if (report.status === status) {
      throw new ReportStatusAlreadySetError(reportId, status);
    }

    const comment = await this.commentDbService.getCommentById(
      report.comment_id,
    );

    if (!comment) {
      throw new CommentNotFoundError(report.comment_id);
    }

    const updatedReport =
      await this.managementCommentDbService.updateReportStatus(
        reportId,
        status,
      );
    await this.notificationService.notifyReportStatusChanged({
      messageId,
      comment,
      report: updatedReport,
    });
  }

  async cancelStatusChange(messageId: number, reportId: string): Promise<void> {
    const report =
      await this.managementCommentDbService.getReportById(reportId);

    if (!report) {
      throw new ReportNotFoundError(reportId);
    }

    const comment = await this.commentDbService.getCommentById(
      report.comment_id,
    );

    if (!comment) {
      throw new CommentNotFoundError(report.comment_id);
    }

    await this.notificationService.notifyReportStatusChanged({
      comment,
      messageId,
      report,
    });
  }

  async requestStatusChange(
    messageId: number,
    reportId: string,
  ): Promise<void> {
    const report =
      await this.managementCommentDbService.getReportById(reportId);

    if (!report) {
      throw new ReportNotFoundError(reportId);
    }

    const comment = await this.commentDbService.getCommentById(
      report.comment_id,
    );

    if (!comment) {
      throw new CommentNotFoundError(report.comment_id);
    }

    await this.notificationService.notifyReportStatusChanged({
      messageId,
      comment,
      report,
    });
  }
}
