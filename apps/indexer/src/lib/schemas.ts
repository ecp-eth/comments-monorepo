import { HexSchema } from "@ecp.eth/sdk/schemas";
import { z } from "zod";
import { normalizeUrl } from "./utils";

/**
 * Search params for listing comment replies.
 */
export const ListCommentsSearchParamsSchema = z.object({
  appSigner: HexSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  targetUri: z
    .string()
    .url()
    .optional()
    .transform((val) => (val ? normalizeUrl(val) : val)),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Search params for listing comment replies.
 */
export const ListCommentRepliesSerchParamsSchema =
  ListCommentsSearchParamsSchema.omit({
    targetUri: true,
  });

/**
 * Search params for listing approvals.
 */
export const ListApprovalsSearchParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
