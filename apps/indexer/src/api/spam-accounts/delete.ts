import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  DeleteSpammerParamSchema,
} from "../../lib/schemas";
import { removeSpammer } from "../../management/services/spammers";
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
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not valid",
    },
    401: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not authenticated",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When spammer was not found in the list",
    },
  },
});

export function setupDeleteSpammer(app: OpenAPIHono) {
  app.openapi(deleteSpammer, async (c) => {
    const { address } = c.req.valid("param");

    const result = await removeSpammer(address);

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
