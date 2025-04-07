import { z } from "zod";
import { HexSchema } from "./core.js";

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

export const IndexerAPICommentSchema = z.object({
  appSigner: HexSchema,
  author: IndexerAPIAuthorDataSchema,
  id: HexSchema,
  content: z.string(),
  chainId: z.number().int(),
  deletedAt: z.coerce.date().nullable(),
  logIndex: z.number().int().nullable(),
  metadata: z.string(),
  parentId: HexSchema.nullable(),
  targetUri: z.string(),
  timestamp: z.coerce.date(),
  txHash: HexSchema,
  cursor: HexSchema,
  moderationStatus: IndexerAPICommentModerationStatusSchema,
  moderationStatusChangedAt: z.coerce.date(),
});

export type IndexerAPICommentSchemaType = z.infer<
  typeof IndexerAPICommentSchema
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

export const IndexerAPIListCommentsSchema = z.object({
  results: z.array(IndexerAPICommentWithRepliesSchema),
  pagination: IndexerAPICursorPaginationSchema,
  extra: IndexerAPIExtraSchema,
});

export type IndexerAPIListCommentsSchemaType = z.infer<
  typeof IndexerAPIListCommentsSchema
>;

export const IndexerAPIListCommentRepliesSchema = z.object({
  results: z.array(IndexerAPICommentSchema),
  pagination: IndexerAPICursorPaginationSchema,
  extra: IndexerAPIExtraSchema,
});

export type IndexerAPIListCommentRepliesSchemaType = z.infer<
  typeof IndexerAPIListCommentRepliesSchema
>;

export const IndexerAPIModerationGetPendingCommentsSchema = z.object({
  results: z.array(IndexerAPICommentSchema),
  pagination: IndexerAPICursorPaginationSchema,
});

export type IndexerAPIModerationGetPendingCommentsSchemaType = z.infer<
  typeof IndexerAPIModerationGetPendingCommentsSchema
>;

export const IndexerAPIModerationChangeModerationStatusOnCommentSchema =
  IndexerAPICommentSchema;

export type IndexerAPIModerationChangeModerationStatusOnCommentSchemaType =
  z.infer<typeof IndexerAPIModerationChangeModerationStatusOnCommentSchema>;
