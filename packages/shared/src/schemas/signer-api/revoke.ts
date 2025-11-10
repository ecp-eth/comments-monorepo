import z from "zod";
import { RemoveApprovalTypedDataSchema } from "@ecp.eth/sdk/comments";
import { HexSchema } from "@ecp.eth/sdk/core";

/**
 * Request payload schema for API that gaslessly adding approval for signer
 */
export const SendRevokeSignerRequestPayloadSchema = z.object({
  signTypedDataParams: RemoveApprovalTypedDataSchema,
  authorSignature: HexSchema,
  authorAddress: HexSchema,
  chainId: z.number(),
});

/**
 * Response schema for API that gaslessly approving signer
 */
export const SendRevokeSignerResponseBodySchema = z.object({
  txHash: HexSchema,
});
