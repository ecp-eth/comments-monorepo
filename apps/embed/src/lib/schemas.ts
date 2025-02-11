import { z } from "zod";
import { HexSchema, CommentDataSchema } from "@ecp.eth/sdk/schemas";

const BaseCommentSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  chainId: z.number(),
  content: z.string(),
  deletedAt: z.coerce.date().nullable(),
  id: HexSchema,
  logIndex: z.number(),
  metadata: z.string(),
  parentId: HexSchema.nullable(),
  targetUri: z.string().nullable(),
  txHash: HexSchema,
  timestamp: z.coerce.date(),
});

export const CommentSchema = BaseCommentSchema.extend({
  replies: z.lazy(() => BaseCommentSchema.array()).optional(),
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

export const SignCommentPayloadRequestSchema = z.object({
  author: HexSchema,
  content: z.string(),
  targetUri: z.string().url(),
  parentId: HexSchema.optional(),
  chainId: z.number(),
});

/**
 * Parses output from API endpoint
 */
export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataSchema.omit({ nonce: true, deadline: true }).extend({
    nonce: z.string().regex(/\d+/),
    deadline: z.string().regex(/\d+/),
  }),
});

/**
 * Parses response from API endpoint for usage in client
 */
export const SignCommentResponseClientSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataSchema,
});

export const ListCommentsSearchParamsSchema = z.object({
  targetUri: z.string().url(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
