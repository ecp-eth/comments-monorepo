import { z } from "zod";
import {
  HexSchema,
  CommentDataSchema,
  IndexerAPICommentSchema,
  type IndexerAPICommentSchemaType,
  IndexerAPIAuthorDataSchema,
} from "@ecp.eth/sdk/schemas";
import { MAX_COMMENT_LENGTH } from "./constants";
// import { isProfane } from "./profanity-detection";

const CommentDataWithIdSchema = CommentDataSchema.extend({
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
    results: CommentSchemaType[];
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

export const CommentSchema: z.ZodType<CommentSchemaType> =
  IndexerAPICommentSchema.extend({
    replies: z
      .object({
        results: z.lazy(() => CommentSchema.array()),
        pagination: z.object({
          limit: z.number(),
          offset: z.number(),
          hasMore: z.boolean(),
        }),
      })
      .optional(),
    pendingOperation: PendingCommentOperationSchema.optional(),
  });

export type Comment = z.infer<typeof CommentSchema>;

export const CommentPageSchema = z.object({
  results: CommentSchema.array(),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type CommentPageSchemaType = z.infer<typeof CommentPageSchema>;

export const SignCommentPayloadRequestSchema = z.object({
  author: HexSchema,
  // replace with following line to enable basic profanity detection
  content: z.string().trim().nonempty().max(MAX_COMMENT_LENGTH),
  /* content: z
    .string()
    .trim()
    .nonempty()
    .max(MAX_COMMENT_LENGTH)
    .refine((val) => !isProfane(val), "Comment contains profanity"), */
  targetUri: z.string().url(),
  parentId: HexSchema.optional(),
  chainId: z.number(),
});

export type SignCommentPayloadRequestSchemaType = z.infer<
  typeof SignCommentPayloadRequestSchema
>;

/**
 * Parses output from API endpoint
 */
export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema.omit({ deadline: true }).extend({
    deadline: z.string().regex(/\d+/),
  }),
});

export const ListCommentsQueryDataSchema = z.object({
  pages: CommentPageSchema.array(),
  pageParams: z.unknown().array(),
});

export type ListCommentsQueryDataSchemaType = z.infer<
  typeof ListCommentsQueryDataSchema
>;
