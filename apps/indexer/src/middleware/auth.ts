import { type Context, type HonoRequest, type MiddlewareHandler } from "hono";
import { verifyAsync } from "@noble/ed25519";
import { HTTPException } from "hono/http-exception";
import { managementAuthService } from "../services";
import type { Hex } from "viem";

const MAX_REQUEST_AGE_MS = 1 * 60 * 1000; // 1 minute

/**
 * Middleware to authenticate requests using API keys and signatures
 *
 * @example
 * ```ts
 * app.use("*", authMiddleware());
 * ```
 *
 * @example
 * ```
 * // Request with signature in query params
 * GET /api/comments?signature=...&timestamp=...&keyId=...
 *
 * // Request with signature in header
 * GET /api/comments
 * x-api-signature: ...
 * x-api-timestamp: ...
 * x-api-key: ...
 * ```
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c: Context, next) => {
    // Try to get signature from header first, then from query params
    const signature =
      c.req.header("x-api-signature") || c.req.query("signature");
    const timestamp =
      c.req.header("x-api-timestamp") || c.req.query("timestamp");
    const keyId = c.req.header("x-api-key") || c.req.query("keyId");

    if (!signature || !timestamp || !keyId) {
      throw new HTTPException(401, {
        message: "Missing authentication parameters",
      });
    }

    const publicKey = await managementAuthService.getPublicKey(keyId as Hex);

    if (!publicKey) {
      throw new HTTPException(401, {
        res: Response.json({ message: "Invalid API key" }, { status: 401 }),
      });
    }

    // Prevent replay attacks by checking timestamp
    const requestTimestamp = parseInt(timestamp, 10);

    if (isNaN(requestTimestamp)) {
      throw new HTTPException(401, {
        res: Response.json(
          { message: "Invalid timestamp format" },
          { status: 401 },
        ),
      });
    }

    const currentTime = Date.now();

    if (Math.abs(currentTime - requestTimestamp) > MAX_REQUEST_AGE_MS) {
      throw new HTTPException(401, {
        res: Response.json({ message: "Request expired" }, { status: 401 }),
      });
    }

    // Create message to verify (same as what client signed)
    const message = await createSignatureMessage(c.req, timestamp);

    // Verify signature
    const isValid = await verifyAsync(signature, message, publicKey);

    if (!isValid) {
      throw new HTTPException(401, {
        res: Response.json({ message: "Invalid signature" }, { status: 401 }),
      });
    }

    await next();
  };
}

async function createSignatureMessage(
  req: HonoRequest,
  timestamp: string,
): Promise<Uint8Array> {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;
  let body = "";

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    body = await req.text();
  }

  // Include query parameters in signature to prevent parameter tampering
  const queryString = url.searchParams.toString();

  return new TextEncoder().encode(
    `${method}${path}${queryString}${timestamp}${body}`,
  );
}
