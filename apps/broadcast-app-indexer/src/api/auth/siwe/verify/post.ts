import { HexSchema } from "@ecp.eth/sdk/core";
import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { siweAuthService } from "../../../../services";
import { SiweAuthError } from "../../../../services/siwe-auth-service";

export async function authSiweVerifyPOST(api: OpenAPIHono) {
  api.openapi(
    {
      method: "post",
      path: "/api/auth/siwe/verify",
      tags: ["Auth"],
      description: "Verify a SIWE request",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                message: z.string().nonempty(),
                signature: HexSchema,
                token: z.string().nonempty(),
              }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "The user was verified",
          content: {
            "application/json": {
              schema: z.object({
                address: HexSchema,
                accessToken: z.object({
                  token: z.string().nonempty(),
                  expiresIn: z.number().int().positive(),
                }),
                refreshToken: z.object({
                  token: z.string().nonempty(),
                  expiresIn: z.number().int().positive(),
                }),
              }),
            },
          },
        },
        400: {
          description: "Invalid SIWE request",
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
      const { message, signature, token } = c.req.valid("json");

      try {
        const jwtAccessTokenResult =
          await siweAuthService.verifyMessageAndCreateSession({
            message,
            signature,
            nonceToken: token,
          });

        return c.json(jwtAccessTokenResult, 200);
      } catch (error) {
        if (error instanceof SiweAuthError) {
          return c.json(
            {
              message: error.message,
            },
            400,
          );
        }

        throw error;
      }
    },
  );
}
