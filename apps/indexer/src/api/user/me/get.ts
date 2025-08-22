import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../services";
import { APIErrorResponseSchema } from "../../../lib/schemas";
import { HTTPException } from "hono/http-exception";

export const UserMeResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date().transform((val) => val.toISOString()),
  updatedAt: z.date().transform((val) => val.toISOString()),
  authMethods: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: z.date().transform((val) => val.toISOString()),
      updatedAt: z.date().transform((val) => val.toISOString()),
      identifier: z.string(),
      method: z.enum(["siwe"]),
    }),
  ),
});

export function setupUserMe(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      middleware: siweMiddleware,
      path: "/user/me",
      tags: ["user"],
      responses: {
        200: {
          description: "User",
          content: {
            "application/json": {
              schema: UserMeResponseSchema,
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
      },
    },
    async (c) => {
      const user = await db.query.user.findFirst({
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

      return c.json(
        // use zod to parse the response so we convert the dates to ISO strings
        // because zod doesn't do this
        UserMeResponseSchema.parse({
          id: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          authMethods: user.authCredentials.map((credential) => ({
            id: credential.id,
            createdAt: credential.createdAt,
            updatedAt: credential.updatedAt,
            identifier: credential.identifier,
            method: credential.method,
          })),
        }),
        200,
      );
    },
  );
}
