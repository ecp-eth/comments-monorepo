import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  GetSpammerParamSchema,
  GetSpammerResponseSchema,
} from "../../lib/schemas";
import { getSpammer } from "../../management/services/spammers";

const isSpammerRoute = createRoute({
  method: "get",
  path: "/api/spam-accounts/{address}",
  tags: ["comments"],
  description: "Check if an address is marked as spammer",
  request: {
    params: GetSpammerParamSchema,
  },
  responses: {
    200: {
      description: "When address is marked as spammer",
      content: {
        "application/json": {
          schema: GetSpammerResponseSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not valid",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When address is not marked as spammer",
    },
  },
});

export function setupGetSpammer(app: OpenAPIHono) {
  app.openapi(isSpammerRoute, async (c) => {
    const { address } = c.req.valid("param");
    const spammer = await getSpammer(address);

    if (spammer) {
      return c.json(
        {
          address: spammer.account,
          createdAt: spammer.created_at,
        },
        200
      );
    }

    return c.json(
      {
        message: "Address is not marked as spammer",
      },
      404
    );
  });

  return app;
}
