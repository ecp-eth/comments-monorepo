import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  EditCommentDataSchema,
  MetadataArraySchema,
} from "@ecp.eth/sdk/comments/schemas";
import { z } from "zod/v3";
import { AuthorSignatureSchema } from "./shared";

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
export const SendEditCommentRequestPayloadSchema = z.object({
  edit: SharedEditCommentRequestPayloadSchema,
  authorSignature: AuthorSignatureSchema,
  deadline: z.coerce.bigint().optional().describe("Deadline of the request"),
});

/**
 * Response body schema for submitting comment to edit
 */
export const SendEditCommentResponseBodySchema =
  SharedEditCommentResponseBodySchema.extend({
    txHash: HexSchema,
  });
