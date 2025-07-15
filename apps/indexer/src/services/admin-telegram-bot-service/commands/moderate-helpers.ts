import { type Hex } from "@ecp.eth/sdk/core";
import { bytesToHex, hexToBytes } from "viem";
import { z } from "zod";
import type { CommentModerationStatus } from "../../../management/types";
import type { CommentSelectType } from "ponder:schema";
import { FormattedString } from "@grammyjs/parse-mode";

type CommentModerationCommand =
  | {
      action: "openChangeStatus";
      commentId: Hex;
    }
  | {
      action: "changeStatus";
      status: CommentModerationStatus;
      commentId: Hex;
    }
  | {
      action: "showCommentContent";
      commentId: Hex;
    }
  | { action: "back"; commentId: Hex }
  | {
      action: "init";
      commentId: Hex;
    };

const ACTION_TO_BYTE = {
  openChangeStatus: 0x00,
  changeStatus: 0x01,
  showCommentContent: 0x02,
  init: 0xfe,
  back: 0xff,
} as const;

export function commentModerationCommandToPayload(
  command: CommentModerationCommand,
): string {
  const idBuffer = Buffer.from(hexToBytes(command.commentId));

  switch (command.action) {
    case "openChangeStatus": {
      const commandBuffer = Buffer.from([ACTION_TO_BYTE.openChangeStatus]);

      return Buffer.concat([commandBuffer, idBuffer]).toString("base64url");
    }
    case "changeStatus": {
      const commandBuffer = Buffer.from([ACTION_TO_BYTE.changeStatus]);
      const statusBuffer = Buffer.from([
        commentModerationStatusToByte(command.status),
      ]);

      return Buffer.concat([commandBuffer, idBuffer, statusBuffer]).toString(
        "base64url",
      );
    }
    case "showCommentContent": {
      const commandBuffer = Buffer.from([ACTION_TO_BYTE.showCommentContent]);

      return Buffer.concat([commandBuffer, idBuffer]).toString("base64url");
    }
    case "init": {
      const commandBuffer = Buffer.from([ACTION_TO_BYTE.init]);

      return Buffer.concat([commandBuffer, idBuffer]).toString("base64url");
    }
    case "back": {
      const commandBuffer = Buffer.from([ACTION_TO_BYTE.back]);

      return Buffer.concat([commandBuffer, idBuffer]).toString("base64url");
    }
    default:
      command satisfies never;

      throw new Error(`Unknown action`);
  }
}

export function commentModerationCommandFromPayload(
  payload: string,
): CommentModerationCommand {
  const buffer = Buffer.from(payload, "base64url");
  const commandBuffer = buffer.subarray(0, 1);

  if (commandBuffer.length !== 1) {
    throw new Error("Invalid command length in payload");
  }

  const commentIdBuffer = buffer.subarray(1, 33);

  if (commentIdBuffer.length !== 32) {
    throw new Error("Invalid comment ID length in payload");
  }

  switch (commandBuffer[0]) {
    case ACTION_TO_BYTE.openChangeStatus: {
      return {
        action: "openChangeStatus",
        commentId: bytesToHex(commentIdBuffer),
      };
    }
    case ACTION_TO_BYTE.changeStatus: {
      const statusBuffer = buffer.subarray(33, 34);

      if (statusBuffer.length !== 1) {
        throw new Error("Invalid status length in payload");
      }

      const status = commentModerationStatusByteToStatus(statusBuffer[0]!);

      return {
        action: "changeStatus",
        status,
        commentId: bytesToHex(commentIdBuffer),
      };
    }
    case ACTION_TO_BYTE.showCommentContent: {
      return {
        action: "showCommentContent",
        commentId: bytesToHex(commentIdBuffer),
      };
    }
    case ACTION_TO_BYTE.init:
      return {
        action: "init",
        commentId: bytesToHex(commentIdBuffer),
      };
    case ACTION_TO_BYTE.back:
      return {
        action: "back",
        commentId: bytesToHex(commentIdBuffer),
      };

    default:
      throw new Error(`Unknown command byte: ${commandBuffer[0]}`);
  }
}

export const moderationCommandParser = z.string().transform((val, ctx) => {
  if (typeof val !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payload must be a base64url encoded string",
    });

    return z.NEVER;
  }

  try {
    return commentModerationCommandFromPayload(val);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid payload format",
    });

    return z.NEVER;
  }
});

function commentModerationStatusToByte(
  status: CommentModerationStatus,
): number {
  switch (status) {
    case "pending":
      return 0x00;
    case "approved":
      return 0x01;
    case "rejected":
      return 0x02;
    default:
      throw new Error(`Unknown moderation status: ${status}`);
  }
}

function commentModerationStatusByteToStatus(
  byte: number,
): CommentModerationStatus {
  switch (byte) {
    case 0x00:
      return "pending";
    case 0x01:
      return "approved";
    case 0x02:
      return "rejected";
    default:
      throw new Error(`Unknown moderation status byte: ${byte}`);
  }
}

export function moderationStatusToString(
  status: CommentModerationStatus,
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      throw new Error(`Unknown moderation status: ${status}`);
  }
}

export function renderComment(
  comment: CommentSelectType,
  author: Hex | string,
): FormattedString {
  let message = FormattedString.bold("Comment ID: ")
    .plain(comment.id)
    .plain("\n")
    .bold("Author: ")
    .plain(author)
    .plain("\n")
    .bold("Status: ")
    .plain(moderationStatusToString(comment.moderationStatus))
    .plain("\n")
    .bold("Changed At: ")
    .plain(comment.moderationStatusChangedAt.toISOString())
    .plain("\n")
    .bold("Classifier Score: ")
    .plain((comment.moderationClassifierScore * 100).toFixed(4) + "%")
    .plain("\n")
    .bold("Classifier Label: ")
    .plain("\n");

  for (const [label, score] of Object.entries(
    comment.moderationClassifierResult,
  )) {
    message = message
      .plain("- ")
      .bold(label)
      .plain(`: ${(score * 100).toFixed(4)}%`)
      .plain("\n");
  }

  return message;
}
