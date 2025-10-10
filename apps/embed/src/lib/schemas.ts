import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { EmbedConfigSchema } from "@ecp.eth/sdk/embed/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { MAX_COMMENT_LENGTH } from "./constants";
import { decompressFromURI } from "lz-ts";
import {
  AddApprovalTypedDataSchema,
  EditCommentDataSchema,
  MetadataEntrySchema,
} from "@ecp.eth/sdk/comments";
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

/**
 * Shared comment payload schema for both gasless and non-gasless for posting comment
 */
export const PostCommentPayloadInputSchema = z.union([
  CommentWithTargetURIInputSchema,
  CommentWithParentIdInputSchema,
]);

export type PostCommentPayloadInputSchemaType = z.input<
  typeof PostCommentPayloadInputSchema
>;

export const SignCommentPayloadRequestSchema = PostCommentPayloadInputSchema;

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
 * Post Comment API request payload
 */
export const PostCommentPayloadRequestSchema = z.object({
  comment: PostCommentPayloadInputSchema,
  authorSignature: HexSchema.describe(
    "Signature of the author, required if the user has not approved our submitter address",
  ),
  deadline: z.coerce
    .bigint()
    .optional()
    .describe(
      "Deadline of the request, required if the user has not approved our submitter address",
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

/**
 * Shared editing comment payload schema for both gasless and non-gasless editing comment
 */
export const EditCommentPayloadInputSchema = z.object({
  commentId: HexSchema,
  content: z.string().trim().nonempty(),
  author: HexSchema,
  metadata: z.array(MetadataEntrySchema),
  chainId: z.number(),
});

export type EditCommentPayloadInputSchemaType = z.input<
  typeof EditCommentPayloadInputSchema
>;

/**
 * Payload schema for signing non-gasless comment editing
 */
export const SignEditCommentPayloadRequestSchema =
  EditCommentPayloadInputSchema;

export type SignEditCommentPayloadRequestSchemaType = z.infer<
  typeof SignEditCommentPayloadRequestSchema
>;

/**
 * Payload schema for editing comment gaslessly
 */
export const EditCommentPayloadRequestSchema = z.object({
  comment: EditCommentPayloadInputSchema,
  authorSignature: HexSchema.describe(
    "Signature of the author, required if the user has not approved our submitter address",
  ),
  deadline: z.coerce
    .bigint()
    .optional()
    .describe(
      "Deadline of the request, required if the user has not approved our submitter address",
    ),
});

export type EditCommentPayloadRequestSchemaType = z.input<
  typeof EditCommentPayloadRequestSchema
>;

export const EditCommentResponseSchema = z.object({
  txHash: HexSchema,
  signature: HexSchema,
  hash: HexSchema,
  data: EditCommentDataSchema,
});

/**
 * Request body schema for API that gaslessly adding approval
 */
export const AddApprovalStatusRequestBodySchema = z.object({
  signTypedDataParams: AddApprovalTypedDataSchema,
  authorSignature: HexSchema,
  authorAddress: HexSchema,
  chainId: z.number(),
});

export type AddApprovalStatusRequestBodySchemaType = z.infer<
  typeof AddApprovalStatusRequestBodySchema
>;
/**
 * Response schema for API that gaslessly approving gasless transactions
 */
export const AddApprovalResponseSchema = z.object({
  txHash: HexSchema,
});

/**
 * Embed config from search params
 */
export const EmbedConfigFromSearchParamsSchema = z.preprocess((value) => {
  try {
    if (typeof value === "string") {
      return JSON.parse(decompressFromURI(value));
    }
  } catch (err) {
    console.warn("failed to parse config", err);
  }
}, EmbedConfigSchema.default({}));

/**
 * Delete Comment payload schema for both gasless and non-gasless
 */
export const DeleteCommentPayloadInputSchema = z.object({
  commentId: HexSchema,
  author: HexSchema,
  chainId: z.number(),
});

export type DeleteCommentPayloadInputSchemaType = z.input<
  typeof DeleteCommentPayloadInputSchema
>;

/**
 * Payload schema for deleting comment gaslessly
 */
export const DeleteCommentPayloadRequestSchema = z.object({
  comment: DeleteCommentPayloadInputSchema,
  authorSignature: HexSchema.describe(
    "Signature of the author, required if the user has not approved our submitter address",
  ),
  deadline: z.coerce
    .bigint()
    .optional()
    .describe(
      "Deadline of the request, required if the user has not approved our submitter address",
    ),
});

export type DeleteCommentPayloadRequestSchemaType = z.input<
  typeof DeleteCommentPayloadRequestSchema
>;

/**
 * Delete Comment API response schema
 */
export const DeleteCommentResponseSchema = z.object({
  txHash: HexSchema,
  signature: HexSchema,
  hash: HexSchema,
  data: z.object({
    commentId: HexSchema,
    author: HexSchema,
    app: HexSchema,
    deadline: z.coerce.bigint(),
  }),
});

export type DeleteCommentResponseSchemaType = z.infer<
  typeof DeleteCommentResponseSchema
>;
