import { z } from "zod";
import { HexSchema } from "../core/schemas.js";

export const IndexerAPIAuthorEnsDataSchema = z.object({
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

export type IndexerAPIAuthorEnsDataSchemaType = z.infer<
  typeof IndexerAPIAuthorEnsDataSchema
>;

export const IndexerAPIFarcasterDataSchema = z.object({
  fid: z.number().int(),
  pfpUrl: z.string().optional(),
  displayName: z.string().optional(),
  username: z.string().optional(),
});

export type IndexerAPIFarcasterDataSchemaType = z.infer<
  typeof IndexerAPIFarcasterDataSchema
>;

export const IndexerAPIAuthorDataSchema = z.object({
  address: HexSchema,
  ens: IndexerAPIAuthorEnsDataSchema.optional(),
  farcaster: IndexerAPIFarcasterDataSchema.optional(),
});

export type IndexerAPIAuthorDataSchemaType = z.infer<
  typeof IndexerAPIAuthorDataSchema
>;

export const IndexerAPICommentModerationStatusSchema = z.enum([
  "approved",
  "rejected",
  "pending",
]);

export type IndexerAPICommentModerationStatusSchemaType = z.infer<
  typeof IndexerAPICommentModerationStatusSchema
>;

export const IndexerAPICommentZeroExSwapSchema = z.object({
  from: z.object({
    address: HexSchema,
    amount: z.coerce.bigint(),
    symbol: z.string(),
  }),
  to: z.object({
    address: HexSchema,
    amount: z.coerce.bigint(),
    symbol: z.string(),
  }),
});

export type IndexerAPICommentZeroExSwapSchemaType = z.infer<
  typeof IndexerAPICommentZeroExSwapSchema
>;

export const IndexerAPICommentSchema = z.object({
  app: HexSchema,
  author: IndexerAPIAuthorDataSchema,
  id: HexSchema,
  channelId: z.coerce.bigint(),
  commentType: z.string(),
  content: z.string(),
  chainId: z.number().int(),
  deletedAt: z.coerce.date().nullable(),
  logIndex: z.number().int().nullable(),
  metadata: z.string(),
  parentId: HexSchema.nullable(),
  targetUri: z.string(),
  txHash: HexSchema,
  cursor: HexSchema,
  moderationStatus: IndexerAPICommentModerationStatusSchema,
  moderationStatusChangedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  revision: z.number().int(),
  zeroExSwap: IndexerAPICommentZeroExSwapSchema.nullable(),
});

export type IndexerAPICommentSchemaType = z.infer<
  typeof IndexerAPICommentSchema
>;

/**
 * Transforms bigint to string to avoid json output issues
 */
const bigintToString = z.coerce.bigint().transform((val) => val.toString());
const dateToString = z.coerce.date().transform((val) => val.toISOString());

export const IndexerAPICommentZeroExSwapOutputSchema = z.object({
  from: z.object({
    address: HexSchema,
    amount: bigintToString,
    symbol: z.string(),
  }),
  to: z.object({
    address: HexSchema,
    amount: bigintToString,
    symbol: z.string(),
  }),
});

export type IndexerAPICommentZeroExSwapOutputSchemaType = z.infer<
  typeof IndexerAPICommentZeroExSwapOutputSchema
>;

export const IndexerAPICommentOutputSchema = IndexerAPICommentSchema.extend({
  channelId: bigintToString,
  createdAt: dateToString,
  updatedAt: dateToString,
  moderationStatusChangedAt: dateToString,
  deletedAt: dateToString.nullable(),
  zeroExSwap: IndexerAPICommentZeroExSwapOutputSchema.nullable(),
});

export type IndexerAPICommentOutputSchemaType = z.infer<
  typeof IndexerAPICommentOutputSchema
>;

export const IndexerAPIPaginationSchema = z.object({
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export type IndexerAPIPaginationSchemaType = z.infer<
  typeof IndexerAPIPaginationSchema
>;

export const IndexerAPICursorPaginationSchema = z.object({
  limit: z.number().int(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
  startCursor: HexSchema.optional(),
  endCursor: HexSchema.optional(),
});

export type IndexerAPICursorPaginationSchemaType = z.infer<
  typeof IndexerAPICursorPaginationSchema
>;

export const IndexerAPIExtraSchema = z.object({
  moderationEnabled: z.boolean(),
});

export type IndexerAPIExtraSchemaType = z.infer<typeof IndexerAPIExtraSchema>;

export const IndexerAPICommentWithRepliesSchema =
  IndexerAPICommentSchema.extend({
    replies: z.object({
      extra: IndexerAPIExtraSchema,
      results: z.array(IndexerAPICommentSchema),
      pagination: IndexerAPICursorPaginationSchema,
    }),
  });

export type IndexerAPICommentWithRepliesSchemaType = z.infer<
  typeof IndexerAPICommentWithRepliesSchema
>;

export const IndexerAPICommentWithRepliesOutputSchema =
  IndexerAPICommentOutputSchema.extend({
    replies: z.object({
      extra: IndexerAPIExtraSchema,
      results: z.array(IndexerAPICommentOutputSchema),
      pagination: IndexerAPICursorPaginationSchema,
    }),
  });

export type IndexerAPICommentWithRepliesOutputSchemaType = z.infer<
  typeof IndexerAPICommentWithRepliesOutputSchema
>;

export const IndexerAPIListCommentsSchema = z.object({
  results: z.array(IndexerAPICommentWithRepliesSchema),
  pagination: IndexerAPICursorPaginationSchema,
  extra: IndexerAPIExtraSchema,
});

export type IndexerAPIListCommentsSchemaType = z.infer<
  typeof IndexerAPIListCommentsSchema
>;

export const IndexerAPIListCommentsOutputSchema =
  IndexerAPIListCommentsSchema.extend({
    results: z.array(IndexerAPICommentWithRepliesOutputSchema),
    pagination: IndexerAPICursorPaginationSchema,
    extra: IndexerAPIExtraSchema,
  });

export type IndexerAPIListCommentsOutputSchemaType = z.infer<
  typeof IndexerAPIListCommentsOutputSchema
>;

export const IndexerAPIListCommentRepliesSchema = z.object({
  results: z.array(IndexerAPICommentSchema),
  pagination: IndexerAPICursorPaginationSchema,
  extra: IndexerAPIExtraSchema,
});

export type IndexerAPIListCommentRepliesSchemaType = z.infer<
  typeof IndexerAPIListCommentRepliesSchema
>;

export const IndexerAPIListCommentRepliesOutputSchema =
  IndexerAPIListCommentRepliesSchema.extend({
    results: z.array(IndexerAPICommentWithRepliesOutputSchema),
    pagination: IndexerAPICursorPaginationSchema,
    extra: IndexerAPIExtraSchema,
  });

export type IndexerAPIListCommentRepliesOutputSchemaType = z.infer<
  typeof IndexerAPIListCommentRepliesOutputSchema
>;

export const IndexerAPIModerationGetPendingCommentsSchema = z.object({
  results: z.array(IndexerAPICommentSchema),
  pagination: IndexerAPICursorPaginationSchema,
});

export type IndexerAPIModerationGetPendingCommentsSchemaType = z.infer<
  typeof IndexerAPIModerationGetPendingCommentsSchema
>;

export const IndexerAPIModerationGetPendingCommentsOutputSchema =
  IndexerAPIModerationGetPendingCommentsSchema.extend({
    results: z.array(IndexerAPICommentOutputSchema),
    pagination: IndexerAPICursorPaginationSchema,
  });

export type IndexerAPIModerationGetPendingCommentsOutputSchemaType = z.infer<
  typeof IndexerAPIModerationGetPendingCommentsOutputSchema
>;

export const IndexerAPIModerationChangeModerationStatusOnCommentSchema =
  IndexerAPICommentSchema;

export type IndexerAPIModerationChangeModerationStatusOnCommentSchemaType =
  z.infer<typeof IndexerAPIModerationChangeModerationStatusOnCommentSchema>;

export const IndexerAPIModerationChangeModerationStatusOnCommentOutputSchema =
  IndexerAPIModerationChangeModerationStatusOnCommentSchema.extend({
    channelId: bigintToString,
  });

export type IndexerAPIModerationChangeModerationStatusOnCommentOutputSchemaType =
  z.infer<
    typeof IndexerAPIModerationChangeModerationStatusOnCommentOutputSchema
  >;
