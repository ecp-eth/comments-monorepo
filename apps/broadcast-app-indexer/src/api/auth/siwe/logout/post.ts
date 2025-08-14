import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { siweMiddleware } from "../../../middleware/siwe";
import { siweAuthService } from "../../../../services";
import { HTTPException } from "hono/http-exception";

export async function authSiweLogoutPOST(api: OpenAPIHono) {
  api.openapi(
    {
      middleware: siweMiddleware,
      method: "post",
      path: "/api/auth/siwe/logout",
      tags: ["Auth"],
      description: "Logout a user",
      responses: {
        204: {
          description: "The user was logged out",
        },
        401: {
          description: "Unauthorized",
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
      const user = c.get("user");

      if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }

      await siweAuthService.revokeSession(user.sessionId);

      return c.newResponse(null, 204);
    },
  );
}
