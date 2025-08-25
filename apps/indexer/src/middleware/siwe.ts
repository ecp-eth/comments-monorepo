import type { Env, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  SiweAuthServiceError,
  type ISiweAuthService,
} from "../services/siwe-auth-service";

export type JWTMiddlewareContext = Env & {
  Variables: {
    // this is not nullable because you can't access the endpoint if the user is not authenticated
    user: {
      id: string;
      sessionId: string;
    };
  };
};

const authorizationHeaderSchema = z
  .string()
  .nonempty()
  .regex(/^Bearer\s[^\s]+$/)
  .transform((val) => {
    return val.slice("Bearer ".length);
  });

type JWTMiddlewareOptions = {
  siweAuthService: ISiweAuthService;
};

export function createSiweMiddleware({
  siweAuthService,
}: JWTMiddlewareOptions): MiddlewareHandler<JWTMiddlewareContext> {
  return async function siweMiddlewareHandler(c, next) {
    try {
      const jwtToken = authorizationHeaderSchema.parse(
        c.req.header("Authorization"),
      );

      const payload = await siweAuthService.verifyAccessToken(jwtToken);

      c.set("user", {
        id: payload.userId,
        sessionId: payload.sessionId,
      });

      await next();
    } catch (e) {
      if (e instanceof z.ZodError || e instanceof SiweAuthServiceError) {
        throw new HTTPException(401, {
          message: "Not authenticated",
        });
      }

      throw e;
    }
  };
}
