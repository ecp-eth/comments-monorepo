import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  IndexerAPICommentModerationStatusSchema,
  IndexerAPIPaginationSchema,
} from "@ecp.eth/sdk/indexer/schemas";
import { z } from "@hono/zod-openapi";
import { normalizeUrl } from "./utils";
import { hexToString } from "viem";

/**
 * Path params schema for resolving an author ENS / Farcaster data.
 */
export const GetAuthorParamsSchema = z.object({
  authorAddress: HexSchema.openapi({
    description: "The author's address",
  }),
});

/**
 * Path params schema for unmuting an account.
 */
export const DeleteMutedAccountParamSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the muted account",
  }),
});

/**
 * Path params schema for checking if an address is marked as muted.
 */
export const GetMutedAccountParamSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the muted account",
  }),
});

/**
 * Response schema for checking if an address is marked as muted.
 */
export const GetMutedAccountResponseSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the muted account",
  }),
  createdAt: z.coerce.date().openapi({
    description: "The date the account was muted",
  }),
});

/**
 * Request body schema for marking an account as muted.
 */
export const PostMutedAccountBodySchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the muted account",
  }),
  reason: z.string().optional().openapi({
    description: "The reason for muting the account",
  }),
});

/**
 * Response schema for marking an account as muted.
 */
export const PostMutedAccountResponseSchema = z.object({
  address: HexSchema.openapi({
    description: "The address of the muted account",
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

const CommentCursorSchema = z.object({
  timestamp: z.coerce.date(),
  id: HexSchema,
});

export type CommentCursorSchemaType = z.infer<typeof CommentCursorSchema>;

/**
 * Schema for parsing a comment cursor from input.
 */
export const InputCommentCursorSchema = z.preprocess((value, ctx) => {
  try {
    const parsed = HexSchema.parse(value);
    const hex = hexToString(parsed);
    const [timestamp, id] = z
      .tuple([z.coerce.number().positive(), HexSchema])
      .parse(hex.split(":"));

    return {
      timestamp,
      id,
    };
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Invalid comment cursor",
      path: ["cursor"],
    });

    return z.NEVER;
  }
}, CommentCursorSchema);

/**
 * Query string schema for getting a list of comments.
 */
export const GetCommentsQuerySchema = z.object({
  author: HexSchema.optional(),
  viewer: HexSchema.optional().openapi({
    description: "The viewer's address",
  }),
  appSigner: HexSchema.optional().openapi({
    description: "The address of the app signer",
  }),
  cursor: InputCommentCursorSchema.optional().openapi({
    description:
      "Non inclusive cursor from which to fetch the comments based on sort",
  }),
  // zod-openapi plugin doesn't automatically infer the minimum value from `int().positive()`
  // so use min(1) for better compatibility
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    description: "The number of comments to return",
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
  mode: z.enum(["nested", "flat"]).default("nested").openapi({
    description:
      "The mode to fetch comments in. Nested will return only the first level of comments. Flat will return all replies sorted by timestamp in descending order.",
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

/**
 * Query string schema for getting a list of pending comments.
 */
export const GetCommentsPendingModerationQuerySchema = z.object({
  cursor: InputCommentCursorSchema.optional().openapi({
    description:
      "Non inclusive cursor from which to fetch the comments based on sort",
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    description: "The number of comments to return",
  }),
  sort: z.enum(["asc", "desc"]).default("desc").openapi({
    description: "The sort order of the comments",
  }),
});

/**
 * Path params schema for moderating a comment.
 */
export const ChangeModerationStatusOnCommentParamsSchema = z.object({
  commentId: HexSchema.openapi({
    description: "The ID of the comment to moderate",
  }),
});

/**
 * Request body schema for changing the moderation status of a comment.
 */
export const ChangeModerationStatusOnCommentBodySchema = z.object({
  moderationStatus: IndexerAPICommentModerationStatusSchema.openapi({
    description: "The moderation status of the comment",
  }),
});

/**
 * Request body schema for approving a comment.
 */
export const WebhookRequestBodyApproveCommentSchema = z.object({
  type: z.literal("approve"),
  commentId: HexSchema,
});

export type WebhookRequestBodyApproveCommentSchemaType = z.infer<
  typeof WebhookRequestBodyApproveCommentSchema
>;

/**
 * Request body schema for rejecting a comment.
 */
export const WebhookRequestBodyRejectCommentSchema = z.object({
  type: z.literal("reject"),
  commentId: HexSchema,
});

export type WebhookRequestBodyRejectCommentSchemaType = z.infer<
  typeof WebhookRequestBodyRejectCommentSchema
>;

const WebhookRequestParamsCommandSchema = z.discriminatedUnion("type", [
  WebhookRequestBodyApproveCommentSchema,
  WebhookRequestBodyRejectCommentSchema,
]);

/**
 * Request params schema for a webhook request.
 */
export const WebhookRequestParamsSchema = z.object({
  c: z.preprocess((value, ctx) => {
    try {
      if (typeof value !== "string") {
        throw new Error("Invalid webhook request");
      }

      return JSON.parse(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid webhook request",
        path: ["c"],
      });

      return z.NEVER;
    }
  }, WebhookRequestParamsCommandSchema),
});
