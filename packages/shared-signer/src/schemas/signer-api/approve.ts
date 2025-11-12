import z from "zod/v3";
import { AddApprovalTypedDataSchema } from "@ecp.eth/sdk/comments";
import { HexSchema } from "@ecp.eth/sdk/core";

/**
 * Request payload schema for API that gaslessly adding approval for signer
 */
export const SendApproveSignerRequestPayloadSchema = z.object({
  signTypedDataParams: AddApprovalTypedDataSchema,
  authorSignature: HexSchema,
  authorAddress: HexSchema,
  chainId: z.number(),
});

/**
 * Response schema for API that gaslessly approving signer
 */
export const SendApproveSignerResponseBodySchema = z.object({
  txHash: HexSchema,
});
