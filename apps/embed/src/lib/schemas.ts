import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { EmbedConfigSchema } from "@ecp.eth/sdk/embed/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { MAX_COMMENT_LENGTH } from "./constants";
import { decompressFromURI } from "lz-ts";
import { MetadataEntrySchema } from "@ecp.eth/sdk/comments";

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

const sharedCommentSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty().max(MAX_COMMENT_LENGTH),
  chainId: z.number(),
});

export const SignCommentPayloadRequestSchema = z.union([
  sharedCommentSchema.extend({
    targetUri: z.string().url(),
  }),
  sharedCommentSchema.extend({
    parentId: HexSchema,
  }),
]);

export type SignCommentPayloadRequestSchemaType = z.infer<
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

export const EmbedConfigFromSearchParamsSchema = z.preprocess((value) => {
  try {
    if (typeof value === "string") {
      return JSON.parse(decompressFromURI(value));
    }
  } catch (err) {
    console.warn("failed to parse config", err);
  }
}, EmbedConfigSchema.default({}));
