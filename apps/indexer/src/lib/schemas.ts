import { HexSchema, IndexerAPIPaginationSchema } from "@ecp.eth/sdk/schemas";
import { z } from "@hono/zod-openapi";
import { normalizeUrl } from "./utils";
import { COMMENT_CALLDATA_SUFFIX_DELIMITER } from "@ecp.eth/sdk";

/**
 * Path params schema for resolving an author ENS / Farcaster data.
 */
export const GetAuthorParamsSchema = z.object({
  authorAddress: HexSchema.openapi({
    description: "The author's address",
  }),
});

/**
 * Response schema for resolving an author ENS / Farcaster data.
 */
export const DeleteSpammerParamSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the spammer",
  }),
});

/**
 * Path params schema for checking if an address is marked as spammer.
 */
export const GetSpammerParamSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the spammer",
  }),
});

export const GetSpammerResponseSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the spammer",
  }),
  createdAt: z.coerce.date().openapi({
    description: "The date the spammer was added",
  }),
});

/**
 * Request body schema for marking an account as spammer.
 */
export const PostSpammerBodySchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the spammer",
  }),
});

/**
 * Response schema for marking an account as spammer.
 */
export const PostSpammerResponseSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the spammer",
  }),
});

/**
 * Path params schema for deleting a comment.
 */
export const DeleteCommentParamSchema = z.object({
  commentId: HexSchema.openapi({
    description: "The ID of the comment to delete",
  }),
});

/**
 * Response schema for an API error.
 */
export const APIErrorResponseSchema = z.object({
  message: z.string().openapi({
    description: "The error message",
  }),
});

/**
 * Query string schema for getting a list of comments.
 */
export const GetCommentsQuerySchema = z.object({
  author: HexSchema.optional(),
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

export const BlockTransactionSchema = z.object({
  input: HexSchema.transform((val, ctx) => {
    const [, encodedCommentData] = val.split(
      COMMENT_CALLDATA_SUFFIX_DELIMITER.slice(2)
    );

    if (!encodedCommentData || encodedCommentData.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Transaction does not contain comment data",
        path: ["input"],
      });

      return z.NEVER;
    }

    return {
      encodedCommentData,
    };
  }),
});
