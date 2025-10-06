import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { EmbedConfigSchema } from "@ecp.eth/sdk/embed/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { MAX_COMMENT_LENGTH } from "./constants";
import { decompressFromURI } from "lz-ts";
import { MetadataEntrySchema } from "@ecp.eth/sdk/comments";
import { DEFAULT_COMMENT_TYPE } from "@ecp.eth/sdk";

export const BadRequestResponseSchema = z.record(
  z.string(),
  z.string().array(),
);

export const InternalServerErrorResponseSchema = z.object({
  error: z.string(),
});

export const GenerateUploadUrlResponseSchema = z.object({
  url: z.string().url(),
});

export type GenerateUploadUrlResponseSchemaType = z.infer<
  typeof GenerateUploadUrlResponseSchema
>;

const SharedCommentInputSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty().max(MAX_COMMENT_LENGTH),
  chainId: z.number(),
  commentType: z.number().default(DEFAULT_COMMENT_TYPE),
});

const CommentWithTargetURIInputSchema = SharedCommentInputSchema.extend({
  targetUri: z.string().url(),
});

const CommentWithParentIdInputSchema = SharedCommentInputSchema.extend({
  parentId: HexSchema,
});

export const CommentPayloadRequestSchema = z.union([
  CommentWithTargetURIInputSchema,
  CommentWithParentIdInputSchema,
]);

export type CommentPayloadRequestSchemaType = z.input<
  typeof CommentPayloadRequestSchema
>;

export const SignCommentPayloadRequestSchema = CommentPayloadRequestSchema;

export type SignCommentPayloadRequestSchemaType = z.input<
  typeof SignCommentPayloadRequestSchema
>;

/**
 * Parses output from API endpoint
 */
export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

/**
 * Used for editing comments (gas is paid by the user)
 */
export const SignEditCommentPayloadRequestSchema = z.object({
  commentId: HexSchema,
  content: z.string().trim().nonempty(),
  author: HexSchema,
  metadata: z.array(MetadataEntrySchema),
  chainId: z.number(),
});

export type SignEditCommentPayloadRequestSchemaType = z.infer<
  typeof SignEditCommentPayloadRequestSchema
>;

/**
 * Post Comment API request payload
 */
export const PostCommentPayloadRequestSchema = z.object({
  comment: CommentPayloadRequestSchema,
  authorSignature: HexSchema.optional().describe(
    "Signature of the author, this is required if the user has not approved our submitter address for post",
  ),
});

export type PostCommentPayloadRequestSchemaType = z.input<
  typeof PostCommentPayloadRequestSchema
>;

/**
 * Post Comment API response schema
 */
export const PostCommentResponseSchema = z.object({
  txHash: HexSchema,
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export const EmbedConfigFromSearchParamsSchema = z.preprocess((value) => {
  try {
    if (typeof value === "string") {
      return JSON.parse(decompressFromURI(value));
    }
  } catch (err) {
    console.warn("failed to parse config", err);
  }
}, EmbedConfigSchema.default({}));
