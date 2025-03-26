import {
  CommentDataSchema,
  HexSchema,
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentSchema,
  type IndexerAPICommentSchemaType,
  IndexerAPICursorPaginationSchema,
  type IndexerAPICursorPaginationSchemaType,
  IndexerAPIExtraSchema,
  type IndexerAPIExtraSchemaType,
} from "@ecp.eth/sdk/schemas";
import { z } from "zod";

export const CommentDataWithIdSchema = CommentDataSchema.extend({
  id: HexSchema,
});

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

export const PendingCommentOperationSchema = z
  .object({
    txHash: HexSchema,
    chainId: z.number().positive().int(),
    response: SignCommentResponseClientSchema,
    resolvedAuthor: IndexerAPIAuthorDataSchema.optional(),
  })
  .describe(
    "Contains information about pending operation so we can show that in comment list"
  );

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
