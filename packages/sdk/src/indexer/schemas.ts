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

export const IndexerAPIModerationClassificationLabelSchema = z.enum([
  "llm_generated",
  "spam",
  "sexual",
  "hate",
  "violence",
  "harassment",
  "self_harm",
  "sexual_minors",
  "hate_threatening",
  "violence_graphic",
]);

export type IndexerAPIModerationClassificationLabelSchemaType = z.infer<
  typeof IndexerAPIModerationClassificationLabelSchema
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
  owner: HexSchema,
  name: z.string(),
  description: z.string(),
  metadata: IndexerAPIMetadataSchema,
  hook: HexSchema.nullable(),
  chainId: z.number().int(),
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
  username: z.string(),
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

export const IndexerAPICommentReferencePositionSchema = z.object({
  start: z.number().int(),
  end: z.number().int(),
});

export const IndexerAPICommentReferenceENSSchema = z.object({
  type: z.literal("ens"),
  avatarUrl: z.string().nullable(),
  name: z.string(),
  address: HexSchema,
  position: IndexerAPICommentReferencePositionSchema,
  url: z.string().url(),
});

export type IndexerAPICommentReferenceENSSchemaType = z.infer<
  typeof IndexerAPICommentReferenceENSSchema
>;

export const IndexerAPICommentReferenceFarcasterSchema = z.object({
  type: z.literal("farcaster"),
  address: HexSchema,
  fid: z.number().int(),
  fname: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  pfpUrl: z.string().nullable(),
  position: IndexerAPICommentReferencePositionSchema,
  url: z.string().url(),
});

export type IndexerAPICommentReferenceFarcasterSchemaType = z.infer<
  typeof IndexerAPICommentReferenceFarcasterSchema
>;

export const IndexerAPICommentReferenceERC20Schema = z.object({
  type: z.literal("erc20"),
  symbol: z.string(),
  logoURI: z.string().nullable(),
  name: z.string(),
  address: HexSchema,
  decimals: z.number().int(),
  position: IndexerAPICommentReferencePositionSchema,
  // if filled this means that user either selected specific token with a chain
  // which resulted in caip19 being used
  // chain id is null for example if comment text contained just an address of contract
  // in which case we don't know what should be the chain id
  chainId: z.number().int().positive().nullable(),
  chains: z.array(
    z.object({
      caip: z.string(),
      chainId: z.number().int().positive(),
    }),
  ),
});

export type IndexerAPICommentReferenceERC20SchemaType = z.infer<
  typeof IndexerAPICommentReferenceERC20Schema
>;

export const IndexerAPICommentReferenceURLWebPageSchema = z.object({
  type: z.literal("webpage"),
  url: z.string().url(),
  position: IndexerAPICommentReferencePositionSchema,
  title: z.string(),
  description: z.string().nullable(),
  favicon: z.string().url().nullable(),
  opengraph: z
    .object({
      title: z.string(),
      description: z.string().nullable(),
      image: z.string().url(),
      url: z.string().url(),
    })
    .nullable(),
});

export type IndexerAPICommentReferenceURLWebPageSchemaType = z.infer<
  typeof IndexerAPICommentReferenceURLWebPageSchema
>;

export const IndexerAPICommentReferenceURLFileSchema = z.object({
  type: z.literal("file"),
  url: z.string().url(),
  position: IndexerAPICommentReferencePositionSchema,
  mediaType: z.string(),
});

export type IndexerAPICommentReferenceURLFileSchemaType = z.infer<
  typeof IndexerAPICommentReferenceURLFileSchema
>;

export const IndexerAPICommentReferenceURLImageSchema = z.object({
  type: z.literal("image"),
  url: z.string().url(),
  position: IndexerAPICommentReferencePositionSchema,
  mediaType: z.string(),
});

export type IndexerAPICommentReferenceURLImageSchemaType = z.infer<
  typeof IndexerAPICommentReferenceURLImageSchema
>;

export const IndexerAPICommentReferenceURLVideoSchema = z.object({
  type: z.literal("video"),
  url: z.string().url(),
  position: IndexerAPICommentReferencePositionSchema,
  mediaType: z.string(),
});

export type IndexerAPICommentReferenceURLVideoSchemaType = z.infer<
  typeof IndexerAPICommentReferenceURLVideoSchema
>;

export const IndexerAPICommentReferenceSchema = z.union([
  IndexerAPICommentReferenceENSSchema,
  IndexerAPICommentReferenceERC20Schema,
  IndexerAPICommentReferenceFarcasterSchema,
  IndexerAPICommentReferenceURLWebPageSchema,
  IndexerAPICommentReferenceURLFileSchema,
  IndexerAPICommentReferenceURLImageSchema,
  IndexerAPICommentReferenceURLVideoSchema,
]);

export type IndexerAPICommentReferenceSchemaType = z.infer<
  typeof IndexerAPICommentReferenceSchema
>;

export const IndexerAPICommentReferencesSchema = z.array(
  IndexerAPICommentReferenceSchema,
);

export type IndexerAPICommentReferencesSchemaType = z.infer<
  typeof IndexerAPICommentReferencesSchema
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
  moderationClassifierResult: z.record(
    IndexerAPIModerationClassificationLabelSchema.or(z.string().nonempty()),
    z.number().min(0).max(1),
  ),
  moderationClassifierScore: z.number().min(0).max(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  revision: z.number().int(),
  zeroExSwap: IndexerAPICommentZeroExSwapSchema.nullable(),
  references: IndexerAPICommentReferencesSchema,
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

export const IndexerAPICommentReactionSchema = IndexerAPICommentSchema.extend({
  viewerReactions: z.record(z.array(IndexerAPICommentSchema)),
  reactionCounts: z.record(z.number()),
});

export const IndexerAPICommentReactionOutputSchema =
  IndexerAPICommentOutputSchema.extend({
    viewerReactions: z.record(z.array(IndexerAPICommentOutputSchema)),
    reactionCounts: z.record(z.number()),
  });

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
  moderationKnownReactions: z.array(z.string()),
});

export type IndexerAPIExtraSchemaType = z.infer<typeof IndexerAPIExtraSchema>;

export const IndexerAPICommentWithRepliesSchema =
  IndexerAPICommentReactionSchema.extend({
    replies: z.object({
      extra: IndexerAPIExtraSchema,
      results: z.array(IndexerAPICommentReactionSchema),
      pagination: IndexerAPICursorPaginationSchema,
    }),
  });

export type IndexerAPICommentWithRepliesSchemaType = z.infer<
  typeof IndexerAPICommentWithRepliesSchema
>;

export const IndexerAPICommentWithRepliesOutputSchema =
  IndexerAPICommentReactionOutputSchema.extend({
    replies: z.object({
      extra: IndexerAPIExtraSchema,
      results: z.array(IndexerAPICommentReactionOutputSchema),
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

export const IndexerAPIAutocompleteENSSchema = z.object({
  type: z.literal("ens"),
  address: HexSchema,
  name: z.string(),
  avatarUrl: z.string().nullable(),
  url: z.string(),
  value: HexSchema.describe(
    "The value in hex format of the autocomplete suggestion that should be used.",
  ),
});

export type IndexerAPIAutocompleteENSSchemaType = z.infer<
  typeof IndexerAPIAutocompleteENSSchema
>;

export const IndexerAPIAutocompleteERC20Schema = z.object({
  type: z.literal("erc20"),
  address: HexSchema,
  name: z.string(),
  symbol: z.string(),
  caip19: z.string(),
  chainId: z.number().int(),
  decimals: z.number().int(),
  logoURI: z.string().nullable(),
  value: z
    .string()
    .describe(
      "The value in CAIP-19 format of the autocomplete suggestion that should be used.",
    ),
});

export type IndexerAPIAutocompleteERC20SchemaType = z.infer<
  typeof IndexerAPIAutocompleteERC20Schema
>;

export const IndexerAPIAutocompleteFarcasterSchema = z.object({
  type: z.literal("farcaster"),
  address: HexSchema,
  fid: z.number().int(),
  fname: z.string(),
  displayName: z.string().nullish(),
  username: z.string(),
  pfpUrl: z.string().nullish(),
  url: z.string(),
  value: HexSchema.describe(
    "The value in hex format of the autocomplete suggestion that should be used.",
  ),
});

export type IndexerAPIAutocompleteFarcasterSchemaType = z.infer<
  typeof IndexerAPIAutocompleteFarcasterSchema
>;

export const IndexerAPIAutocompleteSchema = z.discriminatedUnion("type", [
  IndexerAPIAutocompleteENSSchema,
  IndexerAPIAutocompleteERC20Schema,
  IndexerAPIAutocompleteFarcasterSchema,
]);

export type IndexerAPIAutocompleteSchemaType = z.infer<
  typeof IndexerAPIAutocompleteSchema
>;

export const IndexerAPIGetAutocompleteOutputSchema = z.object({
  results: z.array(IndexerAPIAutocompleteSchema),
});

export type IndexerAPIGetAutocompleteOutputSchemaType = z.infer<
  typeof IndexerAPIGetAutocompleteOutputSchema
>;

export const IndexerAPIReportStatusSchema = z.enum([
  "pending",
  "resolved",
  "closed",
]);

export const IndexerAPIReportSchema = z.object({
  id: z.string().uuid(),
  commentId: HexSchema,
  reportee: HexSchema,
  message: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  status: IndexerAPIReportStatusSchema,
});

export type IndexerAPIReportSchemaType = z.infer<typeof IndexerAPIReportSchema>;

export const IndexerAPIReportOutputSchema = IndexerAPIReportSchema.extend({
  id: z.string().uuid(),
  createdAt: dateToString,
  updatedAt: dateToString,
});

export type IndexerAPIReportOutputSchemaType = z.infer<
  typeof IndexerAPIReportOutputSchema
>;

export const IndexerAPIReportsListPendingSchema = z.object({
  results: z.array(IndexerAPIReportSchema),
  pagination: IndexerAPICursorPaginationSchema,
});

export type IndexerAPIReportsListPendingSchemaType = z.infer<
  typeof IndexerAPIReportsListPendingSchema
>;

export const IndexerAPIReportsListPendingOutputSchema =
  IndexerAPIReportsListPendingSchema.extend({
    results: z.array(IndexerAPIReportOutputSchema),
    pagination: IndexerAPICursorPaginationSchema,
  });

export type IndexerAPIReportsListPendingOutputSchemaType = z.infer<
  typeof IndexerAPIReportsListPendingOutputSchema
>;
