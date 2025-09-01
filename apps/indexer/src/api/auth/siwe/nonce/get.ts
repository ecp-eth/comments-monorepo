import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { siweAuthService } from "../../../../services";
import { formatResponseUsingZodSchema } from "../../../../lib/response-formatters";

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
      responses: {
        200: {
          description: "Nonce and token generated successfully",
          content: {
            "application/json": {
              schema: AuthSiweResponseSchema,
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
