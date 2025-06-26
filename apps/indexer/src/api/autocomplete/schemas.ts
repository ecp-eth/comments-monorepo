import { z } from "@hono/zod-openapi";

/**
 * Query string schema for getting a list of autocomplete suggestions.
 */
export const GetAutocompleteQuerySchema = z.object({
  query: z.string().trim().min(2).openapi({
    description: "The query to autocomplete",
  }),
  char: z.enum(["@", "$"]).openapi({
    description:
      "The prefix character. $ is more specific and looks only for ERC20 tokens (by address or symbol), @ is more general and looks for ENS/Farcaster name and ERC20 tokens.",
  }),
});

export type GetAutocompleteQuerySchemaType = z.infer<
  typeof GetAutocompleteQuerySchema
>;
