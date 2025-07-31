import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_INDEXER_URL: z.string().url().optional(),
  NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL: z.string().url(),
  NEXT_PUBLIC_PINATA_GATEWAY_URL: z.string().nonempty(),
  NEXT_PUBLIC_RPC_URL: z.string().url(),
  NEXT_PUBLIC_APP_SIGNER_ADDRESS: HexSchema,
  NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS: HexSchema,
});

const result = publicEnvSchema.safeParse({
  NEXT_PUBLIC_INDEXER_URL: process.env.NEXT_PUBLIC_INDEXER_URL,
  NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL:
    process.env.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
  NEXT_PUBLIC_PINATA_GATEWAY_URL: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_APP_SIGNER_ADDRESS: process.env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
  NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS:
    process.env.NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS,
});

if (!result.success) {
  throw new Error(
    "Invalid public environment variables: \n\n" +
      JSON.stringify(result.error.format(), null, 2),
  );
}

export const publicEnv = result.data;
