import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { siweAuthService } from "../../../services";

export const AuthSiweResponseSchema = z.object({
  nonce: z.string().nonempty(),
  token: z.string().nonempty(),
});

export function setupAuthSiweNonce(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/auth/siwe/nonce",
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
        {
          nonce,
          token,
        },
        200,
      );
    },
  );
}
