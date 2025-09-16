import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { SiweAuthServiceError } from "../../../../services/siwe-auth-service";
import { siweAuthService } from "../../../../services";
import { APIErrorResponseSchema } from "../../../../lib/schemas";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";

const AuthSiweRefreshHeadersSchema = z.object({
  Authorization: z
    .string()
    .nonempty()
    .regex(/^Bearer\s[^\s]+$/)
    .transform((val) => {
      return val.slice("Bearer ".length);
    }),
});

export const AuthSiweRefreshResponseSchema = z.object({
  accessToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
  refreshToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
});

export function setupAuthSiweRefresh(app: OpenAPIHono) {
  app.openapi(
    {
      method: "post",
      path: "/api/auth/siwe/refresh",
      tags: ["auth", "siwe"],
      description: "Refresh a SIWE access token using a refresh token",
      request: {
        headers: AuthSiweRefreshHeadersSchema,
      },
      responses: {
        200: {
          description: "Tokens refreshed successfully",
          content: {
            "application/json": {
              schema: AuthSiweRefreshResponseSchema,
            },
          },
        },
        400: {
          description: "Invalid request",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
        401: {
          description: "Not authenticated",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
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
      const { Authorization: refreshToken } = c.req.valid("header");

      try {
        const tokens =
          await siweAuthService.verifyRefreshTokenAndIssueNewTokens(
            refreshToken,
          );

        return c.json(
          formatResponseUsingZodSchema(AuthSiweRefreshResponseSchema, tokens),
          200,
        );
      } catch (e) {
        if (e instanceof SiweAuthServiceError) {
          return c.json(
            {
              message: "Not authenticated",
            },
            401,
          );
        }

        throw e;
      }
    },
  );
}
