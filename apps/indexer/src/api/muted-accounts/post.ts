import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  PostMutedAccountBodySchema,
  PostMutedAccountResponseSchema,
} from "../../lib/schemas";
import { authMiddleware } from "../../middleware/auth";
import { mutedAccountsManagementService } from "../../services";

const postMutedAccountRoute = createRoute({
  method: "post",
  path: "/api/muted-accounts",
  middleware: [authMiddleware()],
  tags: ["comments"],
  description:
    "Marks account as muted, newer comments from this account won't be indexed",
  request: {
    body: {
      content: {
        "application/json": {
          schema: PostMutedAccountBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: PostMutedAccountResponseSchema,
        },
      },
      description: "An object with muted account address",
    },
    400: {
      content: {
        "application/json": {
          schema: APIBadRequestResponseSchema,
        },
      },
      description: "Bad request",
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
      description: "When account is already marked as muted",
    },
  },
});

export function setupMarkAuthorAsMuted(app: OpenAPIHono) {
  app.openapi(postMutedAccountRoute, async (c) => {
    const { address, reason } = c.req.valid("json");

    const result = await mutedAccountsManagementService.muteAccount(
      address,
      reason,
    );

    if (!result) {
      return c.json(
        {
          message: "Account is already marked as muted",
        },
        409,
      );
    }

    return c.json(
      {
        address,
      },
      200,
    );
  });

  return app;
}
