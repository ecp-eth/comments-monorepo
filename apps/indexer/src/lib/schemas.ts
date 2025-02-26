import { HexSchema, IndexerAPIPaginationSchema } from "@ecp.eth/sdk/schemas";
import { z } from "@hono/zod-openapi";
import { normalizeUrl } from "./utils";

/**
 * Query string schema for getting a list of comments.
 */
export const GetCommentsQuerySchema = z.object({
  appSigner: HexSchema.optional().openapi({
    description: "The address of the app signer",
  }),
  // zod-openapi plugin doesn't automatically infer the minimum value from `int().positive()`
  // so use min(1) for better compatibility
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    description: "The number of comments to return",
  }),
  offset: z.coerce.number().int().min(0).default(0).openapi({
    description: "The offset of the comments to return",
  }),
  targetUri: z
    .string()
    .url()
    .optional()
    .transform((val) => (val ? normalizeUrl(val) : val))
    .openapi({
      description: "The comment target URI",
    }),
  sort: z.enum(["asc", "desc"]).default("desc").openapi({
    description: "The sort order of the comments",
  }),
});

/**
 * Query string schema for getting a list of comment with replies.
 */
export const GetCommentRepliesQuerySchema = GetCommentsQuerySchema.omit({
  targetUri: true,
});

/**
 * Path params schema for getting a list of comment with replies.
 */
export const GetCommentRepliesParamSchema = z.object({
  commentId: HexSchema.openapi({
    description: "The comment ID",
  }),
});

/**
 * Query string schema for getting a list of approvals.
 */
export const GetApprovalsQuerySchema = z.object({
  author: HexSchema.openapi({
    description: "The author's address",
  }),
  appSigner: HexSchema.openapi({
    description: "The address of the app signer",
  }),
  limit: z.coerce.number().int().positive().max(100).default(50).openapi({
    description: "The number of comments to return",
  }),
  offset: z.coerce.number().int().min(0).default(0).openapi({
    description: "The offset of the comments to return",
  }),
});

/**
 * Schema for a single approval.
 */
export const GetApprovalSchema = z.object({
  id: z.string(),
  appSigner: HexSchema,
  deletedAt: z.coerce.date().nullable(),
  chainId: z.number().int(),
  txHash: HexSchema,
});

/**
 * Response schema for getting a list of approvals.
 */
export const GetApprovalsResponseSchema = z.object({
  results: z.array(GetApprovalSchema),
  pagination: IndexerAPIPaginationSchema,
});
