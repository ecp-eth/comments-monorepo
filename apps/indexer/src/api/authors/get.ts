import { IndexerAPIAuthorDataSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  GetAuthorParamsSchema,
} from "../../lib/schemas";
import { formatAuthor } from "../../lib/response-formatters";
import { rateLimiter } from "hono-rate-limiter";
import { generateRateLimiterKey } from "../../lib/rate-limiter-key-generator";
import { ensByAddressResolverService } from "../../services/ens-by-address-resolver";
import { farcasterByAddressResolverService } from "../../services/farcaster-by-address-resolver";

const rateLimiterMiddleware = rateLimiter({
  standardHeaders: "draft-6",
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: generateRateLimiterKey,
});

const getAuthor = createRoute({
  method: "get",
  path: "/api/authors/{authorAddress}",
  middleware: [rateLimiterMiddleware],
  tags: ["comments"],
  description: "Retrieve author ENS / Farcaster data",
  request: {
    params: GetAuthorParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIAuthorDataSchema,
        },
      },
      description: "An object with author address and ENS and Farcaster data",
    },
    400: {
      content: {
        "application/json": {
          schema: APIBadRequestResponseSchema,
        },
      },
      description: "Bad request",
    },
  },
});

export function setupGetAuthor(app: OpenAPIHono) {
  app.openapi(getAuthor, async (c) => {
    const { authorAddress } = c.req.valid("param");

    const [ens, farcaster] = await Promise.all([
      // we ignore nulls here as it is not as crucial and mostly the errors are thrown due to the address not being found
      ensByAddressResolverService.load(authorAddress).catch(() => null),
      farcasterByAddressResolverService.load(authorAddress).catch(() => null),
    ]);

    return c.json(formatAuthor(authorAddress, ens, farcaster), 200);
  });

  return app;
}
