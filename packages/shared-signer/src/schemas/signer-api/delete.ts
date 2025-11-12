import { z } from "zod/v3";
import { HexSchema } from "@ecp.eth/sdk/core";
import { AuthorSignatureSchema } from "./shared";

/**
 * Payload schema for deleting comment gaslessly
 */
export const SendDeleteCommentRequestPayloadSchema = z.object({
  delete: z.object({
    commentId: HexSchema,
    author: HexSchema,
    chainId: z.coerce.number(),
  }),
  authorSignature: AuthorSignatureSchema,
  deadline: z.coerce.bigint().optional().describe("Deadline of the request"),
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
