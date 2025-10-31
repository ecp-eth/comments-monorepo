import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { GetAutocompleteQuerySchema } from "./schemas";
import { IndexerAPIGetAutocompleteOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { getAutocompleteHandler } from "./handlers/get";
import { APIBadRequestResponseSchema } from "../../lib/schemas";

const getAutocompleteRoute = createRoute({
  method: "get",
  path: "/api/autocomplete",
  tags: ["autocomplete", "ens", "erc20", "farcaster"],
  description: "Retrieve a list of autocomplete suggestions",
  request: {
    query: GetAutocompleteQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIGetAutocompleteOutputSchema,
        },
      },
      description: "List of autocomplete suggestions",
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

export function setupGetAutocomplete(app: OpenAPIHono) {
  app.openapi(getAutocompleteRoute, async (c) => {
    const options = c.req.valid("query");

    return c.json(await getAutocompleteHandler(options), 200);
  });
}
