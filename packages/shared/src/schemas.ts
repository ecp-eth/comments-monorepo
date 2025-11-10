import {
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentReferencesSchema,
  IndexerAPICommentSchema,
  type IndexerAPICommentSchemaType,
  IndexerAPICommentZeroExSwapSchema,
  IndexerAPICursorPaginationSchema,
  type IndexerAPICursorPaginationSchemaType,
  IndexerAPIExtraSchema,
  type IndexerAPIExtraSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  CommentInputData,
  CreateCommentDataSchema,
  MetadataEntrySchema,
} from "@ecp.eth/sdk/comments/schemas";
import { z } from "zod/v3";
import { SignEditCommentResponseBodySchema } from "./schemas/signer-api/edit";
import { SignPostCommentResponseBodySchema } from "./schemas/signer-api/post";

export const CommentDataWithIdSchema = CreateCommentDataSchema.extend({
  id: HexSchema,
  metadata: MetadataEntrySchema.array(),
});

export type CommentDataWithIdSchemaType = z.infer<
  typeof CommentDataWithIdSchema
>;

// this is just for type checking
({}) as CommentDataWithIdSchemaType satisfies CommentInputData;

export const PendingOperationTypeSchema = z.enum([
  "gasless-not-preapproved",
  "gasless-preapproved",
  "non-gasless",
]);

export type PendingOperationTypeSchemaType = z.infer<
  typeof PendingOperationTypeSchema
>;

export const PendingPostCommentOperationSchema = z.object({
  type: PendingOperationTypeSchema,
  action: z.literal("post"),
  txHash: HexSchema,
  chainId: z.number().positive().int(),
  response: SignPostCommentResponseBodySchema,
  resolvedAuthor: IndexerAPIAuthorDataSchema.optional(),
  zeroExSwap: IndexerAPICommentZeroExSwapSchema.optional(),
  state: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("pending"),
    }),
    z.object({
      status: z.literal("success"),
    }),
    z.object({
      status: z.literal("error"),
      error: z.instanceof(Error),
    }),
  ]),
  references: IndexerAPICommentReferencesSchema,
});

export type PendingPostCommentOperationSchemaType = z.infer<
  typeof PendingPostCommentOperationSchema
>;

export const PendingEditCommentOperationSchema = z.object({
  type: PendingOperationTypeSchema,
  action: z.literal("edit"),
  txHash: HexSchema,
  chainId: z.number().positive().int(),
  response: SignEditCommentResponseBodySchema,
  state: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("pending"),
    }),
    z.object({
      status: z.literal("success"),
    }),
    z.object({
      status: z.literal("error"),
      error: z.instanceof(Error),
    }),
  ]),
  references: IndexerAPICommentReferencesSchema,
});

export type PendingEditCommentOperationSchemaType = z.infer<
  typeof PendingEditCommentOperationSchema
>;

export const PendingDeleteCommentOperationSchema = z.object({
  type: PendingOperationTypeSchema,
  action: z.literal("delete"),
  commentId: HexSchema,
  txHash: HexSchema,
  chainId: z.number().positive().int(),
  state: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("pending"),
    }),
    z.object({
      status: z.literal("success"),
    }),
    z.object({
      status: z.literal("error"),
      error: z.instanceof(Error),
    }),
  ]),
});

export type PendingDeleteCommentOperationSchemaType = z.infer<
  typeof PendingDeleteCommentOperationSchema
>;

export const PendingCommentOperationSchema = z.discriminatedUnion("action", [
  PendingPostCommentOperationSchema,
  PendingDeleteCommentOperationSchema,
  PendingEditCommentOperationSchema,
]);

export type PendingCommentOperationSchemaType = z.infer<
  typeof PendingCommentOperationSchema
>;

type CommentSchemaType = IndexerAPICommentSchemaType & {
  pendingOperation?: PendingCommentOperationSchemaType;
  replies?: {
    extra: IndexerAPIExtraSchemaType;
    results: CommentSchemaType[];
    pagination: IndexerAPICursorPaginationSchemaType;
  };
  viewerReactions?: Record<string, IndexerAPICommentSchemaType[]>;
  reactionCounts?: Record<string, number>;
};

type CommentSchemaInputType = IndexerAPICommentSchemaType & {
  pendingOperation?: z.input<typeof PendingCommentOperationSchema>;
  replies?: {
    extra: IndexerAPIExtraSchemaType;
    results: CommentSchemaInputType[];
    pagination: IndexerAPICursorPaginationSchemaType;
  };
  viewerReactions?: Record<string, IndexerAPICommentSchemaType[]>;
  reactionCounts?: Record<string, number>;
};

export const CommentSchema: z.ZodType<
  CommentSchemaType,
  z.ZodTypeDef,
  CommentSchemaInputType
> = IndexerAPICommentSchema.extend({
  replies: z
    .object({
      extra: IndexerAPIExtraSchema,
      results: z.lazy(() => CommentSchema.array()),
      pagination: IndexerAPICursorPaginationSchema,
    })
    .optional(),
  viewerReactions: z.record(z.array(IndexerAPICommentSchema)).optional(),
  reactionCounts: z.record(z.number()).optional(),
  pendingOperation: PendingCommentOperationSchema.optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

export type PendingComment = Omit<Comment, "pendingOperation"> & {
  pendingOperation: PendingCommentOperationSchemaType;
};

export const CommentPageSchema = z.object({
  extra: IndexerAPIExtraSchema,
  results: CommentSchema.array(),
  pagination: IndexerAPICursorPaginationSchema,
});

export type CommentPageSchemaType = z.infer<typeof CommentPageSchema>;

export const ListCommentsQueryPageParamsSchema = z.object({
  cursor: HexSchema.optional(),
  limit: z.number().positive().int(),
});

export type ListCommentsQueryPageParamsSchemaType = z.infer<
  typeof ListCommentsQueryPageParamsSchema
>;

export const ListCommentsQueryDataSchema = z.object({
  pages: CommentPageSchema.array(),
  pageParams: ListCommentsQueryPageParamsSchema.array(),
});

export type ListCommentsQueryDataSchemaType = z.infer<
  typeof ListCommentsQueryDataSchema
>;
