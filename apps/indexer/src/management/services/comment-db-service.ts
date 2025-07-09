import type { Hex } from "@ecp.eth/sdk/core";
import { getIndexerDb } from "../db";
import type { CommentReportStatus } from "../types";
import type { CommentReportSelectType } from "../migrations";

export class ManagementCommentDbService {
  /**
   * Get a report by comment ID
   * @param commentId The ID of the comment to get the report for
   * @returns The report if it exists, undefined otherwise
   */
  async getReportById(
    reportId: string,
  ): Promise<CommentReportSelectType | undefined> {
    const db = getIndexerDb();

    const result = await db
      .selectFrom("comment_reports")
      .selectAll()
      .where("id", "=", reportId)
      .executeTakeFirst();

    return result;
  }

  /**
   * Report a comment with a message
   * @param commentId The ID of the comment to report
   * @param reportee The address of the user reporting the comment
   * @param message Optional message explaining the report
   */
  async insertReport(
    commentId: Hex,
    reportee: Hex,
    message?: string,
  ): Promise<CommentReportSelectType> {
    const db = getIndexerDb();

    const result = await db
      .insertInto("comment_reports")
      .values({
        comment_id: commentId,
        reportee,
        message: message || null,
        created_at: new Date(),
        status: "pending",
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Update the status of a report
   * @param commentId The ID of the comment to update the report for
   * @param status The new status of the report
   */
  async updateReportStatus(
    reportId: string,
    status: CommentReportStatus,
  ): Promise<CommentReportSelectType> {
    const db = getIndexerDb();

    const result = await db
      .updateTable("comment_reports")
      .set({ status, updated_at: new Date() })
      .where("id", "=", reportId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }
}
