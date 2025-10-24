import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { AllowedChainIdSchema } from "../env";

/**
 * Payload schema for deleting comment gaslessly
 */
export const SendDeleteCommentRequestPayloadSchema = z
  .object({
    commentId: HexSchema,
    author: HexSchema,
    chainId: AllowedChainIdSchema,
    authorSignature: HexSchema.describe(
      "Signature of the author, required if the user has not approved our submitter address",
    ),
    deadline: z.coerce
      .bigint()
      .optional()
      .describe(
        "Deadline of the request, required if the user has not approved our submitter address",
      ),
  })
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
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
