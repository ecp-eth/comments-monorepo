import { Errors } from "@farcaster/quick-auth";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { HexSchema, type Hex } from "@ecp.eth/sdk/core";
import { z } from "zod";
import { farcasterQuickAuthService } from "../../services";

export type FarcasterQuickAuthEnv = {
  Variables: {
    user: {
      fid: number;
      address: Hex | null;
    };
  };
};

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
    const [, token] = authorization?.split(" ") || [];

    if (!token) {
      throw new HTTPException(401, { message: "Missing token" });
    }

    try {
      const payload = await farcasterQuickAuthService.verifyAndDecodeRequest(
        token,
        c.req,
      );

      const address = await resolveUserPrimaryEthAddress(payload.sub);

      c.set("user", {
        fid: payload.sub,
        address,
      });
    } catch (e) {
      console.error(e);

      if (e instanceof Errors.InvalidTokenError) {
        console.info("Invalid token:", e.message);

        throw new HTTPException(401, { message: "Invalid token" });
      }

      throw e;
    }

    await next();
  });

class FarcasterAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "FarcasterAPIError";
  }
}

class FarcasterAPIMalformedResponseError extends Error {
  constructor(error: z.ZodError) {
    super(
      `Malformed response from Farcaster API:\n\n${JSON.stringify(error.flatten(), null, 2)}`,
    );
    this.name = "FarcasterAPIMalformedResponseError";
  }
}

const primaryAddressResponseSchema = z.object({
  result: z.object({
    address: z.object({
      address: HexSchema,
    }),
  }),
});

async function resolveUserPrimaryEthAddress(fid: number): Promise<Hex | null> {
  try {
    const response = await fetch(
      `https://api.farcaster.xyz/fc/primary-address?fid=${fid}&protocol=ethereum`,
    );

    if (!response.ok) {
      throw new FarcasterAPIError(
        `Failed to fetch primary address for FID ${fid}: ${response.statusText}`,
        response.status,
      );
    }

    const data = primaryAddressResponseSchema.parse(await response.json());

    return data.result.address.address;
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new FarcasterAPIMalformedResponseError(e);
    }

    throw e;
  }
}
