import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  EditCommentDataSchema,
  MetadataArraySchema,
} from "@ecp.eth/sdk/comments/schemas";
import { z } from "zod";

const SharedEditCommentRequestPayloadSchema = z.object({
  commentId: HexSchema,
  content: z.string().trim().nonempty(),
  author: HexSchema,
  metadata: MetadataArraySchema,
  chainId: z.coerce.number(),
});

const SharedEditCommentResponseBodySchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: EditCommentDataSchema,
});

/**
 * Request payload schema for signing comment to edit
 */
export const SignEditCommentRequestPayloadSchema =
  SharedEditCommentRequestPayloadSchema;

/**
 * Response body schema for signing comment to edit
 */
export const SignEditCommentResponseBodySchema =
  SharedEditCommentResponseBodySchema;

/**
 * Request payload schema for submitting comment to edit
 */
export const SendEditCommentRequestPayloadSchema =
  SharedEditCommentRequestPayloadSchema.extend({
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
 * Response body schema for submitting comment to edit
 */
export const SendEditCommentResponseBodySchema =
  SharedEditCommentResponseBodySchema.extend({
    txHash: HexSchema,
  });
