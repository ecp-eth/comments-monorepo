import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { z } from "zod";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { MetadataArraySchema } from "@ecp.eth/sdk/comments/schemas";
import { DEFAULT_COMMENT_TYPE } from "@ecp.eth/sdk";
import { AllowedChainIdSchema, env } from "@/lib/env";

/**
 * Shared request payload schema for actions related to posting comments
 */
export const SharedCommentRequestPayloadSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty(),
  metadata: MetadataArraySchema,
  chainId: AllowedChainIdSchema.default(env.DEFAULT_CHAIN_ID),
  channelId: z.coerce.bigint().optional(),
  commentType: z.number().default(DEFAULT_COMMENT_TYPE),
});

export const CommentWithTargetURIRequestPayloadSchema =
  SharedCommentRequestPayloadSchema.extend({
    targetUri: z.string().url(),
  });

export const CommentWithParentIdRequestPayloadSchema =
  SharedCommentRequestPayloadSchema.extend({
    parentId: HexSchema,
  });

const SendPostCommentRequestPayloadBaseSchema = z.object({
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
export const SignPostCommentRequestPayloadSchema = z
  .union([
    CommentWithTargetURIRequestPayloadSchema,
    CommentWithParentIdRequestPayloadSchema,
  ])
  .transform((val) => {
    if (!("chainId" in val)) {
      throw new Error("Chain ID is required");
    }

    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

/**
 * Response body schema for signing comment to post
 */
export const SignPostCommentResponseBodySchema =
  SharedPostCommentResponseBodySchema;

/**
 * Request payload schema for submitting comment to post
 */
export const SendPostCommentRequestPayloadSchema = z
  .union([
    SendPostCommentRequestPayloadBaseSchema.extend(
      CommentWithTargetURIRequestPayloadSchema.shape,
    ),
    SendPostCommentRequestPayloadBaseSchema.extend(
      CommentWithParentIdRequestPayloadSchema.shape,
    ),
  ])
  .transform((val) => {
    if (!("chainId" in val)) {
      throw new Error("Chain ID is required");
    }

    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

/**
 * Response body schema for submitting comment to post
 */
export const SendPostCommentResponseBodySchema =
  SharedPostCommentResponseBodySchema.extend({
    txHash: HexSchema,
  });
