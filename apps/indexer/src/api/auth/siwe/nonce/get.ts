import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { siweAuthService } from "../../../../services";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";
import { APIErrorResponseSchema } from "../../../../lib/schemas";

export const AuthSiweResponseSchema = z.object({
  nonce: z.string().nonempty(),
  token: z.string().nonempty(),
});

export function setupAuthSiweNonce(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/auth/siwe/nonce",
      tags: ["auth", "siwe"],
      description: "Get a nonce for a SIWE request",
      responses: {
        200: {
          description: "Nonce and token generated successfully",
          content: {
            "application/json": {
              schema: AuthSiweResponseSchema,
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
      const { nonce, token } = await siweAuthService.generateNonceAndToken();

      return c.json(
        formatResponseUsingZodSchema(AuthSiweResponseSchema, {
          nonce,
          token,
        }),
        200,
        {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      );
    },
  );
}
