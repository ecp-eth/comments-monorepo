import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Hex } from "@ecp.eth/sdk/core";
import type { CommentReportStatus } from "../management/types";

/**
 * Base class for all service-level errors
 */
export abstract class ServiceError extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string) {
    super(status, {
      message,
      res: new Response(JSON.stringify({ message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    });
  }
}

/**
 * Thrown when a comment is not found
 */
export class CommentNotFoundError extends ServiceError {
  constructor(commentId: Hex) {
    super(404, `Comment ${commentId} not found`);
  }
}

export class ReportNotFoundError extends ServiceError {
  constructor(reportId: string) {
    super(404, `Report ${reportId} not found`);
  }
}

export class ReportStatusAlreadySetError extends ServiceError {
  constructor(reportId: string, status: CommentReportStatus) {
    super(400, `Report ${reportId} is already set to ${status}`);
  }
}
