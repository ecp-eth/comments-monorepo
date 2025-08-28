import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { siweAuthService } from "../../../../services";
import { SiweAuthError } from "../../../../services/siwe-auth-service";

export async function authSiweRefreshPOST(api: OpenAPIHono) {
  api.openapi(
    {
      method: "post",
      path: "/api/auth/siwe/refresh",
      tags: ["Auth"],
      description: "Refresh a SIWE access token",
      request: {
        headers: z.object({
          Authorization: z.string().nonempty(),
        }),
      },
      responses: {
        200: {
          description: "The access token was refreshed",
          content: {
            "application/json": {
              schema: z.object({
                accessToken: z.object({
                  token: z.string().nonempty(),
                  expiresAt: z.number().int().positive().openapi({
                    description: "Unix timestamp in seconds",
                  }),
                }),
                refreshToken: z.object({
                  token: z.string().nonempty(),
                  expiresAt: z.number().int().positive().openapi({
                    description: "Unix timestamp in seconds",
                  }),
                }),
              }),
            },
          },
        },
        401: {
          description: "Invalid refresh token",
          content: {
            "application/json": {
              schema: z.object({
                message: z.string().nonempty(),
              }),
            },
          },
        },
      },
    },
    async (c) => {
      const authorizationHeader = c.req.valid("header").Authorization;
      const [, token] = authorizationHeader.split(" ");

      if (!token) {
        throw new HTTPException(401, { message: "Missing token" });
      }

      try {
        const result = await siweAuthService.refreshAccessToken(token);

        return c.json(result, 200);
      } catch (error) {
        if (error instanceof SiweAuthError) {
          throw new HTTPException(401, { message: error.message });
        }

        throw error;
      }
    },
  );
}
