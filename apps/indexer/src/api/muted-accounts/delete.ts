import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  DeleteMutedAccountParamSchema,
} from "../../lib/schemas";
import { unmuteAccount } from "../../management/services/muted-accounts";
import { authMiddleware } from "../../middleware/auth";

const unmuteAccountRoute = createRoute({
  method: "delete",
  path: "/api/muted-accounts/{address}",
  middleware: [authMiddleware()],
  tags: ["comments"],
  description:
    "Removes account from muted list, newer comments from this account will be indexed",
  request: {
    params: DeleteMutedAccountParamSchema,
  },
  responses: {
    204: {
      description: "When muted account was unmuted",
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
      description: "When muted account was not found in the list",
    },
  },
});

export function setupUnmuteAccount(app: OpenAPIHono) {
  app.openapi(unmuteAccountRoute, async (c) => {
    const { address } = c.req.valid("param");

    const result = await unmuteAccount(address);

    if (!result) {
      return c.json(
        {
          message: "Muted account not found",
        },
        404,
      );
    }

    return c.newResponse(null, 204);
  });

  return app;
}
