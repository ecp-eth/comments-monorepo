import type { Hex } from "./schemas.js";

/**
 * Check if a hex string is zero
 * @param hex The hex string to check
 * @returns True if the hex string is zero, false otherwise
 */
export function isZeroHex(hex: Hex) {
  return hex.replace(/0/g, "") === "x";
}
