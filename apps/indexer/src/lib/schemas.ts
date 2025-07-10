import { type Hex, HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  IndexerAPICommentModerationStatusSchema,
  IndexerAPIPaginationSchema,
} from "@ecp.eth/sdk/indexer/schemas";
import { z } from "@hono/zod-openapi";
import { hexToString } from "viem";
import { normalizeUrl } from "./utils";
import { SUPPORTED_CHAIN_IDS } from "../env";
import { CommentModerationLabel } from "../services/types";

export const OpenAPIHexSchema = HexSchema.openapi({
  type: "string",
  pattern: "^0x[a-fA-F0-9]+$",
});

/**
 * Path params schema for resolving an author ENS / Farcaster data.
 */
export const GetAuthorParamsSchema = z.object({
  authorAddress: OpenAPIHexSchema.openapi({
    description: "The author's address",
  }),
});

/**
 * Path params schema for unmuting an account.
 */
export const DeleteMutedAccountParamSchema = z.object({
  address: OpenAPIHexSchema.openapi({
    description: "The address of the muted account",
  }),
});

/**
 * Path params schema for checking if an address is marked as muted.
 */
export const GetMutedAccountParamSchema = z.object({
  address: OpenAPIHexSchema.openapi({
    description: "The address of the muted account",
  }),
});

/**
 * Response schema for checking if an address is marked as muted.
 */
export const GetMutedAccountResponseSchema = z.object({
  address: OpenAPIHexSchema.openapi({
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
  address: OpenAPIHexSchema.openapi({
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
  address: OpenAPIHexSchema.openapi({
    description: "The address of the muted account",
  }),
});

/**
 * Path params schema for deleting a comment.
 */
export const DeleteCommentParamSchema = z.object({
  commentId: OpenAPIHexSchema.openapi({
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

const ReportsCursorSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.string().uuid(),
});

export type ReportsCursorSchemaType = z.infer<typeof ReportsCursorSchema>;

export const InputReportsCursorSchema = z.preprocess((value, ctx) => {
  try {
    const parsed = HexSchema.parse(value);
    const hex = hexToString(parsed);
    const [createdAt, id] = z
      .tuple([z.coerce.number().positive(), z.string().uuid()])
      .parse(hex.split(":"));

    return {
      createdAt,
      id,
    };
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Invalid reports cursor",
      path: ["cursor"],
    });

    return z.NEVER;
  }
}, ReportsCursorSchema);

const ChainIdSchema = z
  .preprocess(
    (val) => {
      if (typeof val === "string") {
        return val.split(",");
      }

      if (typeof val === "number") {
        return [val];
      }

      return undefined;
    },
    z.array(z.coerce.number().int().positive(), {
      message: `Invalid chain ID. Supported chains are: ${SUPPORTED_CHAIN_IDS.join(", ")}`,
    }),
  )
  .openapi({
    type: "string",
    description:
      "Filters by chain ID. Can be a single chain id or comma-separated list of chain ids (e.g. 1,137,10).",
  });

/**
 * Query string schema for getting a list of comments.
 */
export const GetCommentsQuerySchema = z.object({
  author: OpenAPIHexSchema.optional(),
  viewer: OpenAPIHexSchema.optional().openapi({
    description: "The viewer's address",
  }),
  app: OpenAPIHexSchema.optional().openapi({
    description: "The address of the app signer",
  }),
  cursor: InputCommentCursorSchema.optional().openapi({
    description:
      "Non inclusive cursor from which to fetch the comments based on sort",
    type: "string",
    pattern: "^0x[a-fA-F0-9]+$",
  }),
  channelId: z.coerce.bigint().optional().openapi({
    description: "The channel ID",
  }),
  commentType: z.coerce.number().int().min(0).max(255).optional().openapi({
    description:
      "The comment type (e.g. 0=comment, 1=reaction, not passed = all)",
  }),
  chainId: ChainIdSchema,
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
  moderationScore: z.coerce.number().min(0).max(1).optional().openapi({
    description:
      "The moderation score of the comments to return. If the comment's moderation score exceeds the provided value, it is not returned.",
    minimum: 0,
    maximum: 1,
    type: "number",
  }),
  excludeByModerationLabels: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          return val.split(",");
        }

        return val;
      },
      z.array(z.nativeEnum(CommentModerationLabel)),
    )
    .optional()
    .openapi({
      description:
        "The moderation labels to exclude from the comments to return. This filter works in conjunction with the `moderationStatus` filter.",
      type: "string",
      example: "spam,sexual",
      pattern:
        "^(llm_generated|spam|sexual|hate|violence|harassment|self_harm|sexual_minors|hate_threatening|violence_graphic)$",
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
  author: OpenAPIHexSchema.openapi({
    description: "The author's address",
  }),
  app: OpenAPIHexSchema.openapi({
    description: "The address of the app signer",
  }),
  chainId: ChainIdSchema,
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
  app: OpenAPIHexSchema,
  deletedAt: z.coerce.date().nullable(),
  chainId: z.number().int(),
  txHash: OpenAPIHexSchema,
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
    type: "string",
    pattern: "^0x[a-fA-F0-9]+$",
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
    type: "string",
    pattern: "^0x[a-fA-F0-9]+$",
  }),
  owner: OpenAPIHexSchema.optional().openapi({
    description: "Filter channels by owner",
  }),
  chainId: ChainIdSchema,
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
  commentId: OpenAPIHexSchema.openapi({
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

export const ERC_20_CAIP_19_REGEX = /^eip155:(\d+)\/erc20:(0x[a-fA-F0-9]{40})$/;

export type ERC20CAIP19 = `eip155:${number}/erc20:${Hex}`;

export const ERC20Caip19Schema = z.custom<ERC20CAIP19>(
  (val) => {
    if (typeof val !== "string") {
      return false;
    }

    return ERC_20_CAIP_19_REGEX.test(val);
  },
  {
    message: "Invalid CAIP-19",
  },
);
