import { FormattedString } from "@grammyjs/parse-mode";
import type { CommentReportStatus } from "../../../management/types";
import type { CommentReportSelectType } from "../../../management/migrations";
import { z } from "zod";
import { parse as parseUUID, stringify as stringifyUUID } from "uuid";
import type { Hex } from "@ecp.eth/sdk/core";

export function reportStatusToString(status: CommentReportStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      throw new Error(`Unknown report status: ${status}`);
  }
}

export function renderReport(
  report: CommentReportSelectType,
  reportee: Hex | string,
): FormattedString {
  return FormattedString.bold("Report ID: ")
    .plain(report.id)
    .plain("\n")
    .bold("Comment ID: ")
    .plain(report.comment_id)
    .plain("\n")
    .bold("Reported by: ")
    .plain(reportee)
    .plain("\n")
    .bold("Status: ")
    .plain(reportStatusToString(report.status))
    .plain("\n")
    .bold("Last updated at: ")
    .plain(report.updated_at.toISOString())
    .plain("\n")
    .bold("Message: ")
    .plain(report.message.trim() || "<No message>");
}

export function uuidToPayload(uuid: string): string {
  return Buffer.from(parseUUID(uuid)).toString("base64url");
}

export function uuidFromPayload(payload: string): string {
  return stringifyUUID(Buffer.from(payload, "base64url"));
}

export const uuidFromBase64OrDirect = z.string().transform((val, ctx) => {
  if (typeof val !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "String must be either a valid UUID or a base64 encoded UUID",
    });

    return z.NEVER;
  }

  // First try direct UUID parsing
  const directUuid = z.string().uuid().safeParse(val);

  if (directUuid.success) {
    return directUuid.data;
  }

  // If direct parsing fails, try base64 decoding
  try {
    const uuid = uuidFromPayload(val);

    // Validate if the result is actually a UUID
    const validUuid = z.string().uuid().safeParse(uuid);

    if (validUuid.success) {
      return validUuid.data;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "String must be either a valid UUID or a base64 encoded UUID",
    });

    return z.NEVER;
  } catch {
    // If base64 decoding fails or result isn't a valid UUID
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "String must be either a valid UUID or a base64 encoded UUID",
    });

    return z.NEVER;
  }
});

function reportStatusToByte(status: CommentReportStatus): number {
  switch (status) {
    case "pending":
      return 0x00;
    case "resolved":
      return 0x01;
    case "closed":
      return 0x02;
    default:
      throw new Error(`Unknown report status: ${status}`);
  }
}

function byteToReportStatus(byte: number): CommentReportStatus {
  switch (byte) {
    case 0x00:
      return "pending";
    case 0x01:
      return "resolved";
    case 0x02:
      return "closed";
    default:
      throw new Error(`Unknown byte for report status: ${byte}`);
  }
}

/**
 * Formats the command for changing the status of a report.
 *
 * It first construct binary that consists of 16B of UUID + 1B for next status and then returns it as base64url encoded string.
 *
 * @param reportId - The ID of the report to change status for.
 * @param nextStatus - The next status to set for the report.
 */
export function reportChangeStatusCommandToPayload(
  reportId: string,
  nextStatus: CommentReportStatus,
): string {
  const uuidBuffer = Buffer.from(parseUUID(reportId));
  const statusBuffer = Buffer.from([reportStatusToByte(nextStatus)]);

  // Concatenate the UUID buffer and the status buffer
  const combinedBuffer = Buffer.concat([uuidBuffer, statusBuffer]);

  // Return the base64url encoded string
  return combinedBuffer.toString("base64url");
}

/**
 * Parses the base64url encoded payload containing the report ID and next status.
 * @param payload - The base64url encoded payload containing the report ID and next status.
 * @returns The report ID and next status.
 */
export function reportChangeStatusCommandFromPayload(payload: string): {
  reportId: string;
  nextStatus: CommentReportStatus;
} {
  const buffer = Buffer.from(payload, "base64url");

  if (buffer.length !== 17) {
    throw new Error("Invalid payload length. Expected 17 bytes.");
  }

  const uuidBuffer = buffer.subarray(0, 16);

  if (uuidBuffer.length !== 16) {
    throw new Error("Invalid UUID length. Expected 16 bytes.");
  }

  const statusBuffer = buffer.subarray(16, 17);

  if (statusBuffer.length !== 1) {
    throw new Error("Invalid status length. Expected 1 byte.");
  }

  const reportId = stringifyUUID(uuidBuffer);
  const nextStatus = byteToReportStatus(statusBuffer[0]!);

  return {
    reportId,
    nextStatus,
  };
}

export const reportChangeStatusCommandParser = z
  .string()
  .transform((val, ctx) => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payload must be a base64url encoded string",
      });

      return z.NEVER;
    }

    try {
      const command = reportChangeStatusCommandFromPayload(val);

      const { reportId, nextStatus } = z
        .object({
          reportId: z.string().uuid(),
          nextStatus: z.enum(["pending", "resolved", "closed"]),
        })
        .parse(command);

      return {
        reportId,
        nextStatus,
      };
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid payload format",
      });

      return z.NEVER;
    }
  });
