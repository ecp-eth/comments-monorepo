import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Hex } from "@ecp.eth/sdk/core";
import type { CommentReportStatus } from "../management/types.ts";
import type { TelegramCallbackQuery } from "./types.ts";

/**
 * Base class for all service-level errors
 */
export abstract class ServiceError extends HTTPException {
  /**
   * Whether we should reply with this error to the telegram message
   */
  public readonly telegramCallbackQuery?: TelegramCallbackQuery;

  constructor(
    status: ContentfulStatusCode,
    message: string,
    telegramCallbackQuery?: TelegramCallbackQuery,
  ) {
    super(status, {
      message,
      res: new Response(JSON.stringify({ message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    });

    this.telegramCallbackQuery = telegramCallbackQuery;
  }
}

/**
 * Thrown when a comment is not found
 */
export class CommentNotFoundError extends ServiceError {
  public readonly commentId: Hex;

  constructor(commentId: Hex, telegramCallbackQuery?: TelegramCallbackQuery) {
    super(404, `Comment ${commentId} not found`, telegramCallbackQuery);

    this.commentId = commentId;
  }
}

export class CommentModerationStatusNotFoundError extends ServiceError {
  public readonly commentId: Hex;
  public readonly commentRevision: number;

  constructor(
    commentId: Hex,
    commentRevision: number,
    telegramCallbackQuery?: TelegramCallbackQuery,
  ) {
    super(
      404,
      `Comment moderation status not found for comment ${commentId} with revision ${commentRevision}`,
      telegramCallbackQuery,
    );

    this.commentId = commentId;
    this.commentRevision = commentRevision;
  }
}

export class ReportNotFoundError extends ServiceError {
  public readonly reportId: string;

  constructor(reportId: string, telegramCallbackQuery?: TelegramCallbackQuery) {
    super(404, `Report ${reportId} not found`, telegramCallbackQuery);

    this.reportId = reportId;
  }
}

export class ReportStatusAlreadySetError extends ServiceError {
  constructor(
    reportId: string,
    status: CommentReportStatus,
    telegramCallbackQuery?: TelegramCallbackQuery,
  ) {
    super(
      400,
      `Report ${reportId} is already set to ${status}`,
      telegramCallbackQuery,
    );
  }
}
