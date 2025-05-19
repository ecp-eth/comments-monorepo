import { Context, type Next, type MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import crypto from "crypto";

interface HMACOptions {
  secret: string;
  maxAgeInSeconds?: number; // Maximum allowed age of the request in seconds
}

export function hmacMiddleware({
  secret,
  maxAgeInSeconds = 300,
}: HMACOptions): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const signature = c.req.query("signature");
    const timestamp = c.req.query("timestamp");

    if (!signature || !timestamp) {
      throw new HTTPException(401, {
        message: "Missing signature or timestamp parameters",
      });
    }

    // Validate timestamp to prevent replay attacks
    const requestTime = parseInt(timestamp, 10);

    if (isNaN(requestTime)) {
      throw new HTTPException(401, { message: "Invalid timestamp format" });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const age = currentTime - requestTime;

    if (age < 0 || age > maxAgeInSeconds) {
      throw new HTTPException(401, {
        message: "Request timestamp expired or invalid",
      });
    }

    // Get all query parameters except signature and timestamp
    const queryParams = new URLSearchParams(c.req.query());
    queryParams.delete("signature");
    queryParams.delete("timestamp");

    // Sort query parameters to ensure consistent ordering
    const sortedQueryString = Array.from(queryParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const body = await c.req.text();
    const hmac = crypto.createHmac("sha256", secret);

    // Include both query parameters and body in signature calculation
    const calculatedSignature = hmac
      .update(sortedQueryString)
      .update("|") // Separator between query params and body
      .update(body)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature),
      )
    ) {
      throw new HTTPException(401, { message: "Invalid signature" });
    }

    await next();
  };
}
