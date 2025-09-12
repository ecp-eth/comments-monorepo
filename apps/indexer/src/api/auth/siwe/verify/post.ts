import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { siweAuthService } from "../../../../services";
import { HexSchema } from "@ecp.eth/sdk/core";
import { SiweAuthServiceError } from "../../../../services/siwe-auth-service";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

export const AuthSiweVerifyRequestSchema = z.object({
  message: z.string().nonempty(),
  signature: HexSchema,
  token: z.string().nonempty(),
});

export const AuthSiweVerifyResponseSchema = z.object({
  accessToken: z.object({
    token: z.string().nonempty(),
    expiresAt: z.number().int().positive(),
  }),
  refreshToken: z.object({
    token: z.string().nonempty(),
    expiresAt: z.number().int().positive(),
  }),
});

export function setupAuthSiweVerify(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/auth/siwe/verify",
      tags: ["auth", "siwe"],
      request: {
        body: {
          content: {
            "application/json": {
              schema: AuthSiweVerifyRequestSchema,
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "SIWE verification successful",
          content: {
            "application/json": {
              schema: AuthSiweVerifyResponseSchema,
            },
          },
        },
        400: {
          description: "SIWE verification failed",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
      },
    },
    async (c) => {
      const { message, signature, token } = c.req.valid("json");

      try {
        const tokens = await siweAuthService.verifyMessageAndIssueAuthTokens({
          message,
          signature,
          token,
        });

        return c.json(tokens, 200);
      } catch (e) {
        if (e instanceof SiweAuthServiceError) {
          return c.json(
            {
              message: e.message,
            },
            400,
          );
        }

        throw e;
      }
    },
  );
}
