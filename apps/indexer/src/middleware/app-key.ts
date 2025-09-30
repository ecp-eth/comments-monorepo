import type { Env, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  type IAppKeyAuthService,
  AppKeyAuthServiceError,
} from "../services/app-key-auth-service.ts";
import type { AppSelectType } from "../../schema.offchain.ts";

export type AppKeyMiddlewareContext = Env & {
  Variables: {
    // this is not nullable because you can't access the endpoint if the user is not authenticated
    app: AppSelectType;
  };
};

const authorizationHeaderSchema = z
  .string()
  .nonempty()
  .regex(/^App-Key\s[^\s]+$/)
  .transform((val) => {
    return val.slice("App-Key ".length);
  });

type AppKeyMiddlewareOptions = {
  appKeyService: IAppKeyAuthService;
};

export function createAppKeyMiddleware({
  appKeyService,
}: AppKeyMiddlewareOptions): MiddlewareHandler<AppKeyMiddlewareContext> {
  return async function appKeyMiddlewareHandler(c, next) {
    try {
      const appKey = authorizationHeaderSchema.parse(
        c.req.header("Authorization"),
      );

      const { app } = await appKeyService.verifyAppKey(appKey);

      c.set("app", app);

      await next();
    } catch (e) {
      if (e instanceof z.ZodError || e instanceof AppKeyAuthServiceError) {
        throw new HTTPException(401, {
          message: "Not authenticated",
        });
      }

      throw e;
    }
  };
}
