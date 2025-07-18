import { FormattedString } from "@grammyjs/parse-mode";
import type { CommentReportStatus } from "../../../management/types";
import type { CommentReportSelectType } from "../../../management/migrations";
import { z } from "zod";
import { parse as parseUUID, stringify as stringifyUUID } from "uuid";
import type { Hex } from "@ecp.eth/sdk/core";

type ReportCommand =
  | {
      action: "init";
      reportId: string;
    }
  | {
      action: "changeStatus";
      reportId: string;
      status: CommentReportStatus;
    }
  | {
      action: "openChangeStatus";
      reportId: string;
    }
  | {
      action: "back";
      reportId: string;
    };

const ACTION_TO_BYTE = {
  init: 0xfe,
  changeStatus: 0x01,
  openChangeStatus: 0x00,
  back: 0xff,
} as const;

export function reportCommandToPayload(command: ReportCommand): string {
  const idBuffer = Buffer.from(parseUUID(command.reportId));

  switch (command.action) {
    case "back":
    case "init":
    case "openChangeStatus": {
      const commandBuffer = Buffer.from([ACTION_TO_BYTE[command.action]]);

      return Buffer.concat([commandBuffer, idBuffer]).toString("base64url");
    }
    case "changeStatus": {
      const commandBuffer = Buffer.from([ACTION_TO_BYTE.changeStatus]);
      const statusBuffer = Buffer.from([reportStatusToByte(command.status)]);

      return Buffer.concat([commandBuffer, idBuffer, statusBuffer]).toString(
        "base64url",
      );
    }
    default:
      command satisfies never;

      throw new Error(`Unknown command action`);
  }
}

export function reportCommandFromPayload(payload: string): ReportCommand {
  const buffer = Buffer.from(payload, "base64url");
  const commandBuffer = buffer.subarray(0, 1);

  if (commandBuffer.length !== 1) {
    throw new Error("Invalid command length. Expected 1 byte.");
  }

  const idBuffer = buffer.subarray(1, 17);

  if (idBuffer.length !== 16) {
    throw new Error("Invalid ID length. Expected 16 bytes.");
  }

  switch (commandBuffer[0]) {
    case ACTION_TO_BYTE.openChangeStatus:
      return {
        action: "openChangeStatus",
        reportId: stringifyUUID(idBuffer),
      };
    case ACTION_TO_BYTE.changeStatus: {
      const statusBuffer = buffer.subarray(17, 18);

      if (statusBuffer.length !== 1) {
        throw new Error("Invalid status length. Expected 1 byte.");
      }
      const status = byteToReportStatus(statusBuffer[0]!);

      return {
        action: "changeStatus",
        reportId: stringifyUUID(idBuffer),
        status,
      };
    }
    case ACTION_TO_BYTE.back:
      return {
        action: "back",
        reportId: stringifyUUID(idBuffer),
      };
    case ACTION_TO_BYTE.init:
      return {
        action: "init",
        reportId: stringifyUUID(idBuffer),
      };
    default:
      throw new Error(`Unknown command byte: ${commandBuffer[0]}`);
  }
}

export const reportCommandParser = z.string().transform((val, ctx) => {
  if (typeof val !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payload must be a base64url encoded string",
    });

    return z.NEVER;
  }

  try {
    return reportCommandFromPayload(val);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid payload format",
    });

    return z.NEVER;
  }
});

export function reportStatusToString(status: CommentReportStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      status satisfies never;
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

function reportStatusToByte(status: CommentReportStatus): number {
  switch (status) {
    case "pending":
      return 0x00;
    case "resolved":
      return 0x01;
    case "closed":
      return 0x02;
    default:
      status satisfies never;
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
