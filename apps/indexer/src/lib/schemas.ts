import { type Hex, HexSchema } from "@ecp.eth/sdk/core/schemas";
import { IndexerAPICommentModerationStatusSchema } from "@ecp.eth/sdk/indexer/schemas";
import { z } from "@hono/zod-openapi";
import { hexToString } from "viem";
import { normalizeUrl } from "./utils.ts";
import { SUPPORTED_CHAIN_IDS } from "../env.ts";
import { CommentModerationLabel } from "../services/types.ts";
import { ZodIssueCode } from "zod";

export const OpenAPIHexSchema = HexSchema.openapi({
  type: "string",
  pattern: "^0x[a-fA-F0-9]+$",
});

export const ETHAddressSchema = z.custom<Hex>(
  (v) => /^0x[a-fA-F0-9]{40}$/.test(v),
  {
    message: "Invalid Ethereum address",
  },
);

export type ETHAddressSchemaType = z.infer<typeof ETHAddressSchema>;

export const OpenAPIETHAddressSchema = ETHAddressSchema.openapi({
  description: "The Ethereum address of the user",
  type: "string",
  pattern: "^0x[a-fA-F0-9]{40}$",
});

export const ENSNameSchema = z.custom<`${string}.eth`>(
  (v) => /^[a-zA-Z0-9.-]+\.eth$/.test(v),
  {
    message: "Invalid ENS name",
  },
);

export type ENSNameSchemaType = z.infer<typeof ENSNameSchema>;

export const OpenAPIENSNameSchema = ENSNameSchema.openapi({
  description: "The ENS name of the user",
  pattern: "^[a-zA-Z0-9.-]+\\.eth$",
});

export const OpenAPIENSNameOrAddressSchema = OpenAPIETHAddressSchema.or(
  OpenAPIENSNameSchema,
).openapi({
  description: "The ENS name or address of the user",
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
export const APIErrorResponseSchema = z
  .object({
    message: z.string().openapi({
      description: "The error message",
    }),
  })
  .openapi("APIErrorResponse");

/**
 * Shared schema for all API bad request response issues.
 *
 * These are based on zod types
 */
const APIBadRequestResponseIssueSharedSchema = z.object({
  fatal: z.boolean().optional(),
  message: z.string().optional(),
  path: z.array(z.string().or(z.number())),
});

const APIBadRequestResponseIssueInvalidTypeSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_type),
    expected: z.string(),
    received: z.string(),
  });

const APIBadRequestResponseIssueInvalidLiteralSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_literal),
    expected: z.unknown(),
    received: z.unknown(),
  });

const APIBadRequestResponseIssueUnrecognizedKeysSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.unrecognized_keys),
    keys: z.array(z.string()),
  });

const APIBadRequestResponseIssueInvalidUnionSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_union),
    unionErrors: z.array(
      z
        .lazy(() => APIBadRequestZodErrorSchema)
        .openapi({
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: {
                $ref: "#/components/schemas/APIBadRequestValidationErrorResponse",
              },
            },
          },
        }),
    ),
  });

const APIBadRequestResponseInvalidUnionDiscriminatorSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_union_discriminator),
    options: z.array(
      z.union([
        z.string(),
        z.number(),
        z.bigint(),
        z.boolean(),
        z.symbol().openapi({ type: "string", description: "A symbol" }),
        z.null(),
      ]),
    ),
  });

const APIBadRequestResponseIssueInvalidEnumValueSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_enum_value),
    options: z.array(z.string().or(z.number())),
  });

const APIBadRequestResponseIssueInvalidArgumentsSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_arguments),
    argumentsError: z
      .lazy(() => APIBadRequestZodErrorSchema)
      .openapi({
        type: "object",
        properties: {
          issues: {
            type: "array",
            items: {
              $ref: "#/components/schemas/APIBadRequestValidationErrorResponse",
            },
          },
        },
      }),
  });

const APIBadRequestResponseIssueInvalidReturnTypeSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_return_type),
    returnTypeError: z
      .lazy(() => APIBadRequestZodErrorSchema)
      .openapi({
        type: "object",
        properties: {
          issues: {
            type: "array",
            items: {
              $ref: "#/components/schemas/APIBadRequestValidationErrorResponse",
            },
          },
        },
      }),
  });

const APIBadRequestResponseIssueInvalidDateSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_date),
  });

const APIBadRequestResponseIssueInvalidStringSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_string),
    validation: z.string().or(
      z
        .object({
          includes: z.string(),
          position: z.number().optional(),
        })
        .or(
          z
            .object({
              startsWith: z.string(),
            })
            .or(
              z.object({
                endsWith: z.string(),
              }),
            ),
        ),
    ),
  });

const APIBadRequestResponseIssueTooSmallSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.too_small),
    minimum: z.number().or(z.bigint()),
    inclusive: z.boolean(),
    exact: z.boolean().optional(),
    type: z.string(),
  });

const APIBadRequestResponseIssueTooBigSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.too_big),
    maximum: z.number().or(z.bigint()),
    inclusive: z.boolean(),
    exact: z.boolean().optional(),
    type: z.string(),
  });

const APIBadRequestResponseIssueInvalidIntersectionTypesSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.invalid_intersection_types),
  });

const APIBadRequestResponseIssueNotMultipleOfSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.not_multiple_of),
    multipleOf: z.number().or(z.bigint()),
  });

const APIBadRequestResponseIssueNotFiniteSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.not_finite),
  });

const APIBadRequestResponseIssueCustomSchema =
  APIBadRequestResponseIssueSharedSchema.extend({
    code: z.literal(ZodIssueCode.custom),
    params: z.record(z.string(), z.unknown()).optional(),
  });

const APIBadRequestResponseIssueSchema = z.discriminatedUnion("code", [
  APIBadRequestResponseIssueInvalidTypeSchema,
  APIBadRequestResponseIssueInvalidLiteralSchema,
  APIBadRequestResponseIssueUnrecognizedKeysSchema,
  APIBadRequestResponseIssueInvalidUnionSchema,
  APIBadRequestResponseInvalidUnionDiscriminatorSchema,
  APIBadRequestResponseIssueInvalidEnumValueSchema,
  APIBadRequestResponseIssueInvalidArgumentsSchema,
  APIBadRequestResponseIssueInvalidReturnTypeSchema,
  APIBadRequestResponseIssueInvalidDateSchema,
  APIBadRequestResponseIssueInvalidStringSchema,
  APIBadRequestResponseIssueTooSmallSchema,
  APIBadRequestResponseIssueTooBigSchema,
  APIBadRequestResponseIssueInvalidIntersectionTypesSchema,
  APIBadRequestResponseIssueNotMultipleOfSchema,
  APIBadRequestResponseIssueNotFiniteSchema,
  APIBadRequestResponseIssueCustomSchema,
]);

const APIBadRequestZodErrorSchema: z.ZodType<{
  issues: z.output<typeof APIBadRequestResponseIssueSchema>[];
}> = z
  .object({
    issues: z.array(APIBadRequestResponseIssueSchema),
  })
  .openapi("APIBadRequestValidationErrorResponse");

/**
 * Response schema for a bad request.
 */
export const APIBadRequestResponseSchema = z
  .object({
    success: z.literal(false),
    error: APIBadRequestZodErrorSchema,
  })
  .or(APIErrorResponseSchema)
  .openapi("APIBadRequestResponse");

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

export const OpenAPIChainIdSchema = z
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
 * Path params schema for getting one single comment.
 */
export const GetCommentParamSchema = z.object({
  commentId: HexSchema.openapi({
    description: "The ID of the comment to retrieve",
  }),
});

/**
 * Query string schema for getting one single comment.
 */
export const GetCommentQuerySchema = z.object({
  viewer: OpenAPIHexSchema.optional().openapi({
    description:
      "The viewer's address, for personalized data such as reactions",
  }),
  chainId: OpenAPIChainIdSchema,
  mode: z.enum(["nested", "flat"]).default("nested").openapi({
    description:
      "The mode to fetch comments in. Nested will return only the first level of comments. Flat will return all replies sorted by timestamp in descending order.",
  }),
  commentType: z.coerce.number().int().min(0).max(255).optional().openapi({
    description:
      "The comment type (e.g. 0=comment, 1=reaction, not passed = all)",
  }),
  isReplyDeleted: z
    .enum(["1", "0"])
    .transform((val) => val === "1")
    .optional()
    .openapi({
      description:
        "Whether to return only deleted replies or only undeleted replies. If omitted it will return both deleted and undeleted replies.",
      example: "1",
      type: "string",
      pattern: "^(1|0)$",
    }),
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
  chainId: OpenAPIChainIdSchema,
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
        "^(llm_generated|spam|sexual|hate|violence|harassment|self_harm|sexual_minors|hate_threatening|violence_graphic)(,(llm_generated|spam|sexual|hate|violence|harassment|self_harm|sexual_minors|hate_threatening|violence_graphic))*$",
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
  isDeleted: z
    .enum(["1", "0"])
    .transform((val) => val === "1")
    .optional()
    .openapi({
      description:
        "Whether to return only deleted or only undeleted comments. If omitted it will return both deleted and undeleted comments.",
      example: "1",
      type: "string",
      pattern: "^(1|0)$",
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
  chainId: OpenAPIChainIdSchema,
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
  revision: z
    .number()
    .int()
    .nonnegative()
    .openapi({
      description:
        "The revision of the comment. If omitted it will update the latest revision and all older pending revisions.",
    })
    .optional(),
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

export const OpenAPIDateStringSchema = z
  .custom<string | Date>(
    (v: unknown) => {
      const result = z.coerce.date().safeParse(v);

      if (!result.success) {
        return false;
      }

      return true;
    },
    {
      message: "Could not parse date",
    },
  )
  .transform((val) => z.coerce.date().parse(val).toISOString())
  .openapi({
    description: "A date string in ISO 8601 format",
    type: "string",
  });

export const OpenAPIBigintStringSchema = z
  .custom<string | bigint>(
    (v: unknown) => {
      return z.coerce.bigint().safeParse(v).success;
    },
    {
      message: "Could not parse bigint",
    },
  )
  .transform((v) => z.coerce.bigint().parse(v).toString())
  .openapi({
    description: "A bigint string",
    type: "string",
  });

export const OpenAPIFloatFromDbSchema = z
  .preprocess((v, ctx) => {
    const result = z.coerce.number().safeParse(v);

    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid float",
      });

      return z.NEVER;
    }

    return result.data;
  }, z.number())
  .openapi({
    type: "number",
  });

export const OpenAPIMaskedAppSecretSchema = z
  .string()
  .transform((secret) => {
    return secret.slice(0, 4) + "......." + secret.slice(-4);
  })
  .openapi({
    description: "Masked app secret",
    type: "string",
  });

export const AppWebhookDeliveryStatusSchema = z.enum([
  "pending",
  "processing",
  "failed",
  "success",
]);
