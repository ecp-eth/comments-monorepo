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
