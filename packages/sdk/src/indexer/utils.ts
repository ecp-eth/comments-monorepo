import { stringToHex } from "viem";
import type { Hex } from "../core/schemas.js";

/**
 * Get the cursor for a comment
 * @param commentId The ID of the comment
 * @param timestamp The timestamp of the comment
 * @returns The cursor for the comment
 */
export function getCommentCursor(commentId: Hex, timestamp: Date): Hex {
  return stringToHex(`${timestamp.getTime()}:${commentId}`);
}

/**
 * Get the cursor for a channel
 * @param channelId The ID of the channel
 * @param timestamp The timestamp of the channel
 * @returns The cursor for the channel
 */
export function getChannelCursor(channelId: bigint, timestamp: Date): Hex {
  return stringToHex(`${timestamp.getTime()}:${channelId.toString()}`);
}

/**
 * Get the cursor for a report
 * @param id The ID of the report
 * @param timestamp The timestamp of the report
 * @returns The cursor for the report
 */
export function getReportsCursor(id: string, timestamp: Date): Hex {
  return stringToHex(`${timestamp.getTime()}:${id}`);
}
