import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import xxhash from "xxhash-wasm";

const { h64ToString } = await xxhash();

/**
 * Generates a rate limiter key based on the request context
 * @param c - The request context
 * @returns The rate limiter key
 */
export function generateRateLimiterKey(c: Context): string {
  const connInfo = getConnInfo(c);

  const key = `${connInfo.remote.address}:${connInfo.remote.port}:${c.req.header("User-Agent")}:${c.req.header("Accept-Language")}`;

  console.log(key);

  return h64ToString(key);
}
