import { z } from "zod";
import { HexSchema } from "../core/schemas.js";
import type { MetadataType, MetadataRecord } from "../comments/metadata.js";
import {
  convertRecordToContractFormat,
  convertContractToRecordFormat,
} from "../comments/metadata.js";
import type { Hex } from "../core/schemas.js";

/**
 * Transforms bigint to string to avoid json output issues
 */
const bigintToString = z.coerce.bigint().transform((val) => val.toString());
const dateToString = z.coerce.date().transform((val) => val.toISOString());

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

export const IndexerAPIMetadataEntrySchema = z.object({
  key: HexSchema,
  value: HexSchema,
});

export type IndexerAPIMetadataEntrySchemaType = z.infer<
  typeof IndexerAPIMetadataEntrySchema
>;

export const IndexerAPIMetadataSchema = z.array(IndexerAPIMetadataEntrySchema);

export type IndexerAPIMetadataSchemaType = z.infer<
  typeof IndexerAPIMetadataSchema
>;

export const IndexerAPIChannelSchema = z.object({
  id: z.coerce.bigint(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  name: z.string(),
  description: z.string(),
  metadata: IndexerAPIMetadataSchema,
  hook: HexSchema.nullable(),
});

export type IndexerAPIChannelSchemaType = z.infer<
  typeof IndexerAPIChannelSchema
>;

export const IndexerAPIChannelOutputSchema = IndexerAPIChannelSchema.extend({
  id: bigintToString,
  createdAt: dateToString,
  updatedAt: dateToString,
});

export type IndexerAPIChannelOutputSchemaType = z.infer<
  typeof IndexerAPIChannelOutputSchema
>;

export const IndexerAPIListChannelsSchema = z.object({
  results: z.array(IndexerAPIChannelSchema),
  pagination: IndexerAPICursorPaginationSchema,
});

export type IndexerAPIListChannelsSchemaType = z.infer<
  typeof IndexerAPIListChannelsSchema
>;

export const IndexerAPIListChannelsOutputSchema =
  IndexerAPIListChannelsSchema.extend({
    results: z.array(IndexerAPIChannelOutputSchema),
    pagination: IndexerAPICursorPaginationSchema,
  });

export type IndexerAPIListChannelsOutputSchemaType = z.infer<
  typeof IndexerAPIListChannelsOutputSchema
>;

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

export const IndexerAPICommentListModeSchema = z.enum(["nested", "flat"]);

export type IndexerAPICommentListModeSchemaType = z.infer<
  typeof IndexerAPICommentListModeSchema
>;

export const IndexerAPISortSchema = z.enum(["asc", "desc"]);

export type IndexerAPISortSchemaType = z.infer<typeof IndexerAPISortSchema>;

export const IndexerAPIZeroExTokenAmountSchema = z.coerce
  .string()
  .regex(/^\d+(\.\d+)?$/, {
    message: "Amount must be a number with optional decimal part",
  });

export const IndexerAPICommentZeroExSwapSchema = z.object({
  from: z.object({
    address: HexSchema,
    amount: IndexerAPIZeroExTokenAmountSchema,
    symbol: z.string(),
  }),
  to: z.object({
    address: HexSchema,
    amount: IndexerAPIZeroExTokenAmountSchema,
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
  commentType: z.number().int().min(0).max(255),
  content: z.string(),
  chainId: z.number().int(),
  deletedAt: z.coerce.date().nullable(),
  logIndex: z.number().int().nullable(),
  metadata: IndexerAPIMetadataSchema,
  hookMetadata: IndexerAPIMetadataSchema,
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

export const IndexerAPICommentOutputSchema = IndexerAPICommentSchema.extend({
  channelId: bigintToString,
  createdAt: dateToString,
  updatedAt: dateToString,
  moderationStatusChangedAt: dateToString,
  deletedAt: dateToString.nullable(),
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

// Re-export metadata conversion functions for indexer use
export {
  type MetadataType,
  type MetadataRecord,
  convertRecordToContractFormat,
  convertContractToRecordFormat,
  createKeyTypeMap,
  prepareMetadataForContract,
  parseMetadataFromContract,
} from "../comments/metadata.js";

/**
 * Converts IndexerAPI MetadataEntry array to Record format for easier manipulation
 *
 * @param metadataEntries - Array of MetadataEntry from indexer API
 * @param keyTypeMap - Optional mapping of known keys to their original string and type
 * @returns The metadata in Record format
 */
export function convertIndexerMetadataToRecord(
  metadataEntries: IndexerAPIMetadataEntrySchemaType[],
  keyTypeMap?: Record<Hex, { key: string; type: MetadataType }>,
): MetadataRecord {
  return convertContractToRecordFormat(metadataEntries, keyTypeMap);
}

/**
 * Converts Record format metadata to IndexerAPI MetadataEntry array format
 *
 * @param metadataRecord - The metadata in Record format
 * @returns Array of MetadataEntry for indexer API use
 */
export function convertRecordToIndexerMetadata(
  metadataRecord: MetadataRecord,
): IndexerAPIMetadataEntrySchemaType[] {
  return convertRecordToContractFormat(metadataRecord);
}
