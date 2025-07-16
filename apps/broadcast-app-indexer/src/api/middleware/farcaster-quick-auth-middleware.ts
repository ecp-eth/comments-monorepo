import { Errors, createClient } from "@farcaster/quick-auth";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { env } from "../../env";

export type FarcasterQuickAuthEnv = {
  Variables: {
    userFarcasterId: number; // The Farcaster user ID extracted from the JWT
  };
};

const client = createClient();

/**
 * Middleware to authenticate Farcaster users using QuickAuth.
 * It checks for a Bearer token in the Authorization header,
 * verifies it, and sets the userFarcasterId in the context.
 *
 * @returns {Promise<void>}
 */
export const farcasterQuickAuthMiddleware =
  createMiddleware<FarcasterQuickAuthEnv>(async (c, next) => {
    const authorization = c.req.header("Authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing token" });
    }

    try {
      const payload = await client.verifyJwt({
        token: authorization.split(" ")[1] as string,
        domain: env.BROADCAST_APP_MINI_APP_DOMAIN,
      });

      c.set("userFarcasterId", payload.sub);
    } catch (e) {
      if (e instanceof Errors.InvalidTokenError) {
        console.info("Invalid token:", e.message);

        throw new HTTPException(401, { message: "Invalid token" });
      }

      throw e;
    }

    await next();
  });
