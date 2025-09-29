import { type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../services";
import { APIErrorResponseSchema } from "../../../lib/schemas";
import { HTTPException } from "hono/http-exception";
import { schema } from "../../../../schema";
import { eq } from "drizzle-orm";

export function setupUsersMeDelete(app: OpenAPIHono) {
  app.openapi(
    {
      method: "delete",
      middleware: siweMiddleware,
      path: "/api/users/me",
      tags: ["user"],
      description: "Delete the current user",
      responses: {
        204: {
          description: "User deleted successfully",
        },
        401: {
          description: "Not authenticated",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
      },
    },
    async (c) => {
      await db.transaction(async (tx) => {
        const user = await tx.query.user.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, c.get("user")!.id);
          },
          with: {
            authCredentials: true,
          },
        });

        if (!user) {
          throw new HTTPException(401, {
            message: "Not authenticated",
          });
        }

        const [deletedUser] = await tx
          .update(schema.user)
          .set({
            deletedAt: new Date(),
          })
          .where(eq(schema.user.id, user.id))
          .returning()
          .execute();

        if (!deletedUser) {
          throw new HTTPException(401, {
            message: "Not authenticated",
          });
        }
      });

      return c.newResponse(null, 204);
    },
  );
}
