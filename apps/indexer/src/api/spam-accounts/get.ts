import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  GetSpammerParamSchema,
} from "../../lib/schemas";
import { isSpammer } from "../../management/services/spammers";

const isSpammerRoute = createRoute({
  method: "get",
  path: "/api/spam-accounts/{address}",
  tags: ["comments"],
  description: "Check if an address is marked as spammer",
  request: {
    params: GetSpammerParamSchema,
  },
  responses: {
    204: {
      description: "When address is marked as spammer",
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

    if (await isSpammer(address)) {
      return c.newResponse(null, 204);
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
