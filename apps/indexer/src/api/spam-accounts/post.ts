import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  PostSpammerBodySchema,
  PostSpammerResponseSchema,
} from "../../lib/schemas";
import { getIndexerDb } from "../../management/db";
import { authMiddleware } from "../../middleware/auth";

const postSpammer = createRoute({
  method: "post",
  path: "/api/spam-accounts",
  middleware: [authMiddleware()],
  tags: ["comments"],
  description:
    "Marks account as spammer, futher comments from this account won't be indexed",
  request: {
    body: {
      content: {
        "application/json": {
          schema: PostSpammerBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: PostSpammerResponseSchema,
        },
      },
      description: "An object with author address and ENS and Farcaster data",
    },
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request data is not valid",
    },
    401: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not authenticated",
    },
    409: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When account is already marked as spammer",
    },
  },
});

export function setupMarkAuthorAsSpammer(app: OpenAPIHono) {
  app.openapi(postSpammer, async (c) => {
    const { address } = c.req.valid("json");
    const db = getIndexerDb();

    const result = await db
      .insertInto("spam_accounts")
      .values({ account: address })
      .onConflict((oc) => oc.column("account").doNothing())
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return c.json(
        {
          message: "Account is already marked as spammer",
        },
        409
      );
    }

    return c.json(
      {
        address,
      },
      200
    );
  });

  return app;
}
