import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { siweAuthService } from "../../../../services";
import { HexSchema } from "@ecp.eth/sdk/core";
import { SiweAuthService_Error } from "../../../../services/siwe-auth-service";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
} from "../../../../lib/schemas";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";

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
      path: "/api/auth/siwe/verify",
      tags: ["auth", "siwe"],
      description: "Verify a SIWE request and issue auth tokens",
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
          description: "SIWE verification successful and auth tokens issued",
          content: {
            "application/json": {
              schema: AuthSiweVerifyResponseSchema,
            },
          },
        },
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: APIBadRequestResponseSchema,
            },
          },
        },
        500: {
          description: "Internal server error",
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

        return c.json(
          formatResponseUsingZodSchema(AuthSiweVerifyResponseSchema, tokens),
          200,
        );
      } catch (e) {
        if (e instanceof SiweAuthService_Error) {
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
