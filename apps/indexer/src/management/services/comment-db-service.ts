import type { Hex } from "@ecp.eth/sdk/core";
import { db as dbService } from "../../services/db";
import type { CommentReportStatus } from "../types";
import { schema } from "../../../schema";
import { desc, eq } from "drizzle-orm";
import { CommentReportSelectType } from "../../../schema.offchain";

export class CommentNotFoundError extends Error {}

export class ReportNotFoundError extends Error {}

export class ManagementCommentDbService {
  constructor(private db: typeof dbService) {}

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

  /**
   * Report a comment with a message
   *
   * @param commentId The ID of the comment to report
   * @param reportee The address of the user reporting the comment
   * @param message Optional message explaining the report
   */
  async insertReport(
    commentId: Hex,
    reportee: Hex,
    message: string,
  ): Promise<CommentReportSelectType> {
    return await this.db.transaction(async (tx) => {
      const comment = await tx.query.comment.findFirst({
        where: eq(schema.comment.id, commentId),
      });

      if (!comment) {
        throw new CommentNotFoundError();
      }

      const [result] = await this.db
        .insert(schema.commentReports)
        .values({
          commentId: comment.id,
          reportee,
          message,
          createdAt: new Date(),
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
  async updateReportStatus(
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
      throw new ReportNotFoundError();
    }

    return result;
  }
}
