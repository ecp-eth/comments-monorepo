import { type Context, type HonoRequest, type MiddlewareHandler } from "hono";
import { verifyAsync } from "@noble/ed25519";
import { HTTPException } from "hono/http-exception";
import { ManagementAuthService } from "../management/services/auth";
import { getIndexerDb } from "../management/db";

export function authMiddleware(): MiddlewareHandler {
  const authService = new ManagementAuthService(getIndexerDb());

  return async (c: Context, next) => {
    const signature = c.req.header("x-api-signature");
    const timestamp = c.req.header("x-api-timestamp");
    const keyId = c.req.header("x-api-key");

    if (!signature || !timestamp || !keyId) {
      throw new HTTPException(401, {
        message: "Missing authentication headers",
      });
    }

    const publicKey = await authService.getPublicKey(keyId);

    if (!publicKey) {
      throw new HTTPException(401, {
        res: Response.json({ message: "Invalid API key" }, { status: 401 }),
      });
    }

    // Prevent replay attacks by checking timestamp
    if (isTimestampTooOld(timestamp)) {
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

function isTimestampTooOld(timestamp: string): boolean {
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const oneMinute = 1 * 60 * 1000; // 1 minute in milliseconds

  return Math.abs(currentTime - requestTime) > oneMinute;
}

async function createSignatureMessage(
  req: HonoRequest,
  timestamp: string
): Promise<Uint8Array> {
  const method = req.method;
  const path = new URL(req.url).pathname;
  let body = "";

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    body = await req.text();
  }

  return new TextEncoder().encode(`${method}${path}${timestamp}${body}`);
}
