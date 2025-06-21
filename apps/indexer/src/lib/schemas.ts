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
  createdAt: z.coerce.date(),
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
    const [createdAt, id] = z
      .tuple([z.coerce.number().positive(), HexSchema])
      .parse(hex.split(":"));

    return {
      createdAt,
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
  app: HexSchema.optional().openapi({
    description: "The address of the app signer",
  }),
  cursor: InputCommentCursorSchema.optional().openapi({
    description:
      "Non inclusive cursor from which to fetch the comments based on sort",
  }),
  channelId: z.coerce.bigint().optional().openapi({
    description: "The channel ID",
  }),
  commentType: z.coerce.number().int().min(0).max(255).optional().openapi({
    description: "The comment type (e.g. 0=comment, 1=reaction)",
  }),
  moderationStatus: z
    .preprocess(
      (val) => {
        if (typeof val === "string" && val.includes(",")) {
          return val.split(",");
        }

        return val;
      },
      IndexerAPICommentModerationStatusSchema.or(
        z.array(IndexerAPICommentModerationStatusSchema),
      ).optional(),
    )
    .openapi({
      description:
        "The moderation status of the comments to return. If omitted it will return comments based on moderation settings (approved if moderation is enabled).",
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
  app: HexSchema.openapi({
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
  app: HexSchema,
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

const ChannelCursorSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.coerce.bigint(),
});

export type ChannelCursorSchemaType = z.infer<typeof ChannelCursorSchema>;

/**
 * Schema for parsing a comment cursor from input.
 */
export const InputChannelCursorSchema = z.preprocess((value, ctx) => {
  try {
    const parsed = HexSchema.parse(value);
    const hex = hexToString(parsed);
    const [createdAt, id] = z
      .tuple([z.coerce.number().positive(), z.coerce.bigint()])
      .parse(hex.split(":"));

    return {
      createdAt,
      id,
    };
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Invalid channel cursor",
      path: ["cursor"],
    });

    return z.NEVER;
  }
}, ChannelCursorSchema);

/**
 * Query string schema for getting a list of channels.
 */
export const GetChannelsQuerySchema = z.object({
  cursor: InputChannelCursorSchema.optional().openapi({
    description:
      "Non inclusive cursor from which to fetch the channels based on sort",
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    description: "The number of channels to return",
  }),
  sort: z.enum(["asc", "desc"]).default("desc").openapi({
    description: "The sort order of the channels",
  }),
});

export const GetChannelParamsSchema = z.object({
  channelId: z.coerce.bigint().openapi({
    description: "The ID of the channel",
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
