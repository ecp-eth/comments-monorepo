import { type OpenAPIHono, z } from "@hono/zod-openapi";
import { siweAuthService } from "../../../../services";

export async function authSiweNonceGET(api: OpenAPIHono) {
  api.openapi(
    {
      method: "get",
      path: "/api/auth/siwe/nonce",
      tags: ["Auth"],
      description: "Get a nonce for a SIWE request",
      responses: {
        200: {
          description: "The nonce",
          content: {
            "application/json": {
              schema: z.object({
                nonce: z.string(),
                nonceToken: z.string(),
                expiresIn: z.number().int().positive(),
              }),
            },
          },
        },
      },
    },
    async (c) => {
      return c.json(await siweAuthService.generateNonceAndToken(), 200);
    },
  );
}
