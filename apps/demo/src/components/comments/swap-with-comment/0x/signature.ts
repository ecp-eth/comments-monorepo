import { HexSchema } from "@ecp.eth/sdk/schemas";
import { TypedData, TypedDataDomain } from "abitype";
import { z } from "zod";

export interface EIP712TypedData {
  types: TypedData;
  domain: TypedDataDomain;
  message: {
    [key: string]: unknown;
  };
  primaryType: string;
}

export const EIP712TypedDataSchema = z.object({
  types: z.record(z.array(z.object({ name: z.string(), type: z.string() }))),
  domain: z.object({
    name: z.string(),
    version: z.string(),
    chainId: z.number(),
    verifyingContract: HexSchema,
    salt: HexSchema,
  }),
  message: z.record(z.unknown()),
  primaryType: z.string(),
});

export type EIP712TypedDataSchemaType = z.infer<typeof EIP712TypedDataSchema>;
