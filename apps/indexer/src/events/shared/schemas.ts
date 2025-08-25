import { z } from "zod";
import {
  MetadataArraySchema,
  MetadataArrayOpSchema,
} from "@ecp.eth/sdk/comments/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";

export type MetadataArray = z.infer<typeof MetadataArraySchema>;
export type MetadataArrayOp = z.infer<typeof MetadataArrayOpSchema>;

export const bigintToStringSchema = z
  .bigint()
  .transform((val) => val.toString());
export const dateToIsoStringSchema = z
  .date()
  .transform((val) => val.toISOString());

export const EventFromChainSchema = z.object({
  chainId: z.number().int(),
  blockNumber: bigintToStringSchema,
  logIndex: z.number().int(),
  txHash: HexSchema,
});
