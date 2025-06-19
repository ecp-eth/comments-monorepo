import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  WebhookRequestParamsSchema,
} from "../../lib/schemas";
import { hmacMiddleware } from "../../middleware/hmac";
import { env } from "../../env";
import { MAX_WEBHOOK_REQUEST_AGE_SECONDS } from "../../lib/constants";
import { commentModerationService } from "../../management/services";

const webhookRoute = createRoute({
  method: "get",
  path: "/api/webhook",
  middleware: [
    hmacMiddleware({
      secret: env.WEBHOOK_SECRET,
      maxAgeInSeconds: MAX_WEBHOOK_REQUEST_AGE_SECONDS,
    }),
  ],
  description: "Webhook to receive commands",
  request: {
    query: WebhookRequestParamsSchema,
  },
  responses: {
    204: {
      description: "When webhook request is valid",
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
      description: "When request signature is not valid",
    },
  },
});

export function setupWebhook(app: OpenAPIHono) {
  app.openapi(webhookRoute, async (c) => {
    const { c: command } = c.req.valid("query");

    switch (command.type) {
      case "approve":
        await commentModerationService.updateModerationStatus(
          command.commentId,
          "approved",
        );
        break;
      case "reject":
        await commentModerationService.updateModerationStatus(
          command.commentId,
          "rejected",
        );
        break;
    }

    return c.newResponse(null, 204);
  });

  return app;
}
