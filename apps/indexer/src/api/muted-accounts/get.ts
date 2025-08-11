import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  GetMutedAccountParamSchema,
  GetMutedAccountResponseSchema,
} from "../../lib/schemas";
import { mutedAccountsManagementService } from "../../services";

const isMutedRoute = createRoute({
  method: "get",
  path: "/api/muted-accounts/{address}",
  tags: ["comments"],
  description: "Check if an address is marked as muted",
  request: {
    params: GetMutedAccountParamSchema,
  },
  responses: {
    200: {
      description: "When address is marked as muted",
      content: {
        "application/json": {
          schema: GetMutedAccountResponseSchema,
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
      description: "When address is not marked as muted",
    },
  },
});

export function setupGetMutedAccount(app: OpenAPIHono) {
  app.openapi(isMutedRoute, async (c) => {
    const { address } = c.req.valid("param");
    const mutedAccount =
      await mutedAccountsManagementService.getMutedAccount(address);

    if (mutedAccount) {
      return c.json(
        {
          address: mutedAccount.account,
          createdAt: mutedAccount.createdAt,
        },
        200,
      );
    }

    return c.json(
      {
        message: "Address is not marked as muted",
      },
      404,
    );
  });

  return app;
}
