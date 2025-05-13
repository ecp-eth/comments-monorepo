import {
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentSchema,
  type IndexerAPICommentSchemaType,
  IndexerAPICursorPaginationSchema,
  type IndexerAPICursorPaginationSchemaType,
  IndexerAPIExtraSchema,
  type IndexerAPIExtraSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  CommentInputData,
  CreateCommentDataSchema,
} from "@ecp.eth/sdk/comments/schemas";
import { z } from "zod";

export const CommentDataWithIdSchema = CreateCommentDataSchema.extend({
  id: HexSchema,
});

// this is just for type checking
({}) as z.infer<typeof CommentDataWithIdSchema> satisfies CommentInputData;

/**
 * Parses response from API endpoint for usage in client
 */
export const SignCommentResponseClientSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export type SignCommentResponseClientSchemaType = z.infer<
  typeof SignCommentResponseClientSchema
>;

export const PendingOperationTypeSchema = z.enum([
  "gasless-not-approved",
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
  response: SignCommentResponseClientSchema,
  resolvedAuthor: IndexerAPIAuthorDataSchema.optional(),
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

export type PendingPostCommentOperationSchemaType = z.infer<
  typeof PendingPostCommentOperationSchema
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
};

export const CommentSchema: z.ZodType<CommentSchemaType> =
  IndexerAPICommentSchema.extend({
    replies: z
      .object({
        extra: IndexerAPIExtraSchema,
        results: z.lazy(() => CommentSchema.array()),
        pagination: IndexerAPICursorPaginationSchema,
      })
      .optional(),
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
