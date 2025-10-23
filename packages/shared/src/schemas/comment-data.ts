import {
  IndexerAPICommentSchema,
  type IndexerAPICommentSchemaType,
  IndexerAPICursorPaginationSchema,
  type IndexerAPICursorPaginationSchemaType,
  IndexerAPIExtraSchema,
  type IndexerAPIExtraSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";

import { z } from "zod";
import {
  PendingCommentOperationSchema,
  PendingCommentOperationSchemaType,
} from "./pending-operation";

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

/**
 * Represents a comment that is pending in memory on client side
 */
export type PendingComment = Omit<Comment, "pendingOperation"> & {
  pendingOperation: PendingCommentOperationSchemaType;
};
