import {
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentReferencesSchema,
  IndexerAPICommentZeroExSwapSchema,
  IndexerAPIExtraSchema,
  type IndexerAPIExtraSchemaType,
  IndexerAPICursorRepliesPaginationSchema,
  type IndexerAPICursorRepliesPaginationSchemaType,
  IndexerAPIListCommentsSchema,
  IndexerAPICommentSchema,
  type IndexerAPICommentSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod/v3";
import { SignEditCommentResponseBodySchema } from "@ecp.eth/shared-signer/schemas/signer-api/edit";
import { SignPostCommentResponseBodySchema } from "@ecp.eth/shared-signer/schemas/signer-api/post";
export {
  CommentDataWithIdSchema,
  type CommentDataWithIdSchemaType,
} from "@ecp.eth/shared-signer/schemas/signer-api/shared";

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

export type PendingCommentOperationSchemaInputType = z.input<
  typeof PendingCommentOperationSchema
>;

export type PendingCommentOperationSchemaType = z.infer<
  typeof PendingCommentOperationSchema
>;

type CommentSchemaType = Omit<IndexerAPICommentSchemaType, "replies"> & {
  pendingOperation?: PendingCommentOperationSchemaType;
  replies: {
    extra: IndexerAPIExtraSchemaType;
    results: CommentSchemaType[];
    pagination: IndexerAPICursorRepliesPaginationSchemaType;
  };
};

type CommentSchemaInputType = Omit<IndexerAPICommentSchemaType, "replies"> & {
  pendingOperation?: PendingCommentOperationSchemaInputType;
  replies: {
    extra: IndexerAPIExtraSchemaType;
    results: CommentSchemaInputType[];
    pagination: IndexerAPICursorRepliesPaginationSchemaType;
  };
};

export const CommentSchema = IndexerAPICommentSchema.omit({
  replies: true,
}).extend({
  pendingOperation: PendingCommentOperationSchema.optional(),
  replies: z.object({
    extra: IndexerAPIExtraSchema,
    results: z.lazy(
      (): z.ZodArray<
        z.ZodType<CommentSchemaType, z.ZodTypeDef, CommentSchemaInputType>,
        "many"
      > => CommentSchema.array(),
    ),
    pagination: IndexerAPICursorRepliesPaginationSchema,
  }),
});

export type Comment = z.infer<typeof CommentSchema>;

export type Reaction = IndexerAPICommentSchemaType;

export type PendingComment = Omit<Comment, "pendingOperation"> & {
  pendingOperation: PendingCommentOperationSchemaType;
};

export const CommentPageSchema = IndexerAPIListCommentsSchema.omit({
  results: true,
}).extend({
  results: CommentSchema.array(),
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
