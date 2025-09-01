import type { OpenAPIHono } from "@hono/zod-openapi";
import { siweMiddleware } from "../../../middleware/siwe";
import { HexSchema } from "@ecp.eth/sdk/core";
import z from "zod";
import { HTTPException } from "hono/http-exception";

export async function authSiweMeGET(api: OpenAPIHono) {
  api.openapi(
    {
      middleware: siweMiddleware,
      method: "get",
      path: "/api/auth/siwe/me",
      tags: ["Auth"],
      description: "Get the current user",
      responses: {
        200: {
          description: "The current user",
          content: {
            "application/json": {
              schema: z.object({
                address: HexSchema,
              }),
            },
          },
        },
      },
    },
    async (c) => {
      const user = c.get("user");

      if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }

      return c.json({ address: user.address }, 200);
    },
  );
}
