import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { db, siweMiddleware } from "../../../services";
import {
  APIErrorResponseSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas";
import { HTTPException } from "hono/http-exception";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters";

export const UserMeResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: OpenAPIDateStringSchema,
  updatedAt: OpenAPIDateStringSchema,
  authMethods: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: OpenAPIDateStringSchema,
      updatedAt: OpenAPIDateStringSchema,
      identifier: z.string(),
      method: z.enum(["siwe"]),
    }),
  ),
  role: z.enum(["admin", "user"]),
});

export function setupUsersMe(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      middleware: siweMiddleware,
      path: "/api/users/me",
      tags: ["user"],
      description: "Get the current user",
      responses: {
        200: {
          description: "User details",
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
        formatResponseUsingZodSchema(UserMeResponseSchema, {
          id: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          authMethods: user.authCredentials,
          role: user.role,
        }),
        200,
      );
    },
  );
}
