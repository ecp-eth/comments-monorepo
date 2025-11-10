import { z } from "zod/v3";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { MetadataArraySchema } from "@ecp.eth/sdk/comments/schemas";
import { DEFAULT_COMMENT_TYPE } from "@ecp.eth/sdk";
import { AuthorSignatureSchema, CommentDataWithIdSchema } from "./shared";

/**
 * Shared request payload schema for actions related to posting comments
 */
const SharedCommentRequestPayloadSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty(),
  metadata: MetadataArraySchema,
  chainId: z.coerce.number(),
  channelId: z.coerce.bigint().optional(),
  commentType: z.number().default(DEFAULT_COMMENT_TYPE),
});

const CommentWithTargetURIRequestPayloadSchema =
  SharedCommentRequestPayloadSchema.extend({
    targetUri: z
      .string()
      .url()
      .describe("The URI of the target resource, e.g. https://example.com"),
  });

const CommentWithParentIdRequestPayloadSchema =
  SharedCommentRequestPayloadSchema.extend({
    parentId: HexSchema,
  });

const SharedCommentUnionRequestPayloadSchema = z.union([
  CommentWithTargetURIRequestPayloadSchema,
  CommentWithParentIdRequestPayloadSchema,
]);

const DeadlineSchema = z.coerce
  .bigint()
  .optional()
  .describe("Deadline of the request");

/**
 * Shared response body schema for actions related to posting comments
 */
const SharedPostCommentResponseBodySchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

/**
 * Request payload schema for signing comment to post
 */
export const SignPostCommentRequestPayloadSchema =
  SharedCommentUnionRequestPayloadSchema;

/**
 * Response body schema for signing comment to post
 */
export const SignPostCommentResponseBodySchema =
  SharedPostCommentResponseBodySchema;

/**
 * Request payload schema for submitting comment to post
 */
export const SendPostCommentRequestPayloadSchema = z.object({
  comment: SharedCommentUnionRequestPayloadSchema,
  authorSignature: AuthorSignatureSchema,
  deadline: DeadlineSchema,
});

/**
 * Response body schema for submitting comment to post
 */
export const SendPostCommentResponseBodySchema =
  SharedPostCommentResponseBodySchema.extend({
    txHash: HexSchema,
  });
