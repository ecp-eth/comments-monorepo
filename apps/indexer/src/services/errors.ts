import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Hex } from "@ecp.eth/sdk/core";
import type { CommentReportStatus } from "../management/types";

/**
 * Base class for all service-level errors
 */
export abstract class ServiceError extends HTTPException {
  /**
   * Whether we should reply with this error to the telegram message
   */
  public readonly telegramMessageId?: number;

  constructor(
    status: ContentfulStatusCode,
    message: string,
    telegramMessageId?: number,
  ) {
    super(status, {
      message,
      res: new Response(JSON.stringify({ message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    });

    this.telegramMessageId = telegramMessageId;
  }
}

/**
 * Thrown when a comment is not found
 */
export class CommentNotFoundError extends ServiceError {
  public readonly commentId: Hex;

  constructor(commentId: Hex, telegramMessageId?: number) {
    super(404, `Comment ${commentId} not found`, telegramMessageId);

    this.commentId = commentId;
  }
}

export class ReportNotFoundError extends ServiceError {
  public readonly reportId: string;

  constructor(reportId: string, telegramMessageId?: number) {
    super(404, `Report ${reportId} not found`, telegramMessageId);

    this.reportId = reportId;
  }
}

export class ReportStatusAlreadySetError extends ServiceError {
  constructor(
    reportId: string,
    status: CommentReportStatus,
    telegramMessageId?: number,
  ) {
    super(
      400,
      `Report ${reportId} is already set to ${status}`,
      telegramMessageId,
    );
  }
}
