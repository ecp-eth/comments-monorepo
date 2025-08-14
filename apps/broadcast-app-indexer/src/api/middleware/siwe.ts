import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { type Hex } from "@ecp.eth/sdk/core";
import { siweAuthService } from "../../services";
import { SiweAuthError } from "../../services/siwe-auth-service";

export type SiweAuthEnv = {
  Variables: {
    user: {
      address: Hex;
      sessionId: string;
    } | null;
  };
};

/**
 * Middleware to authenticate users using Siwe.
 * It checks for a Bearer token in the Authorization header,
 * verifies it, and sets the user address in the context.
 *
 * @returns {Promise<void>}
 */
export const siweMiddleware = createMiddleware<SiweAuthEnv>(async (c, next) => {
  const authorization = c.req.header("Authorization");
  const [, token] = authorization?.split(" ") || [];

  if (!token) {
    throw new HTTPException(401, { message: "Missing token" });
  }

  try {
    const payload = await siweAuthService.verifyJWTAccessToken(token);

    c.set("user", {
      address: payload.address,
      sessionId: payload.sessionId,
    });
  } catch (e) {
    if (e instanceof SiweAuthError) {
      throw new HTTPException(401, { message: "Invalid token" });
    }

    console.error(e);

    throw e;
  }

  await next();
});
