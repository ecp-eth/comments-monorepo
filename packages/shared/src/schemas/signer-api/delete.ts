import { z } from "zod/v3";
import { HexSchema } from "@ecp.eth/sdk/core";

/**
 * Payload schema for deleting comment gaslessly
 */
export const SendDeleteCommentRequestPayloadSchema = z.object({
  commentId: HexSchema,
  author: HexSchema,
  chainId: z.coerce.number(),
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
 * Delete Comment API response schema
 */
export const SendDeleteCommentResponseBodySchema = z.object({
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
