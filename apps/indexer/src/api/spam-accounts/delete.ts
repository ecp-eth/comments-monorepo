import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  DeleteSpammerNotFoundResponseSchema,
  DeleteSpammerParamSchema,
} from "../../lib/schemas";
import { getIndexerDb } from "../../management/db";
import { authMiddleware } from "../../middleware/auth";

const deleteSpammer = createRoute({
  method: "delete",
  path: "/api/spam-accounts/{address}",
  middleware: [authMiddleware()],
  tags: ["comments"],
  description:
    "Removes account from spammer list, futher comments from this account will be indexed",
  request: {
    params: DeleteSpammerParamSchema,
  },
  responses: {
    204: {
      description: "When spammer was deleted from the list",
    },
    404: {
      content: {
        "application/json": {
          schema: DeleteSpammerNotFoundResponseSchema,
        },
      },
      description: "When spammer was not found in the list",
    },
  },
});

export function setupDeleteSpammer(app: OpenAPIHono) {
  app.openapi(deleteSpammer, async (c) => {
    const { address } = c.req.valid("param");
    const db = getIndexerDb();

    const result = await db
      .deleteFrom("spam_accounts")
      .where("account", "=", address)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return c.json(
        {
          message: "Spammer not found",
        },
        404
      );
    }

    return c.newResponse(null, 204);
  });

  return app;
}
