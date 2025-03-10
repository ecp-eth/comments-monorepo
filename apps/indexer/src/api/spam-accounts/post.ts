import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  PostSpammerBodySchema,
  PostSpammerResponseSchema,
} from "../../lib/schemas";
import { getIndexerDb } from "../../management/db";

const postSpammer = createRoute({
  method: "post",
  path: "/api/spam-accounts",
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
  },
});

export function setupMarkAuthorAsSpammer(app: OpenAPIHono) {
  app.openapi(postSpammer, async (c) => {
    const { address } = c.req.valid("json");
    const db = getIndexerDb();

    await db.insertInto("spam_accounts").values({ account: address }).execute();

    return c.json(
      {
        address,
      },
      200
    );
  });

  return app;
}
