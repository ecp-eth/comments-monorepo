import { stringToHex } from "viem";
import type { Hex } from "../core/schemas.js";
import { ResponseError } from "./errors.js";

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

/**
 * Check if a response is retryable
 * @param response The response to check
 * @returns True if the response is retryable, false otherwise
 */
export function isRetryableHttpResponse(response: Response): boolean {
  return (
    response.status >= 500 ||
    response.status === 408 ||
    response.status === 425 ||
    response.status === 429
  );
}

/**
 * Determine if a fetch error from the indexer API should be retried
 * @param error The error to check
 * @returns True if the error should be retried, false otherwise
 */
export function indexerApiRetryCondition(error: unknown): boolean {
  if (!(error instanceof ResponseError)) {
    return true;
  }

  return isRetryableHttpResponse(error.response);
}
