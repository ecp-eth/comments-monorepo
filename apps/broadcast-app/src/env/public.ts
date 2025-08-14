import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_INDEXER_URL: z.string().url().optional(),
  NEXT_PUBLIC_PINATA_GATEWAY_URL: z.string().nonempty(),
  NEXT_PUBLIC_RPC_URL: z.string().url(),
  NEXT_PUBLIC_APP_SIGNER_ADDRESS: HexSchema,
  NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS: HexSchema,
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_WC_PROJECT_ID: z.string().nonempty(),
  NEXT_PUBLIC_CHAIN_ID: z.custom<keyof typeof SUPPORTED_CHAINS>(
    (data) => {
      if (data in SUPPORTED_CHAINS) {
        return true;
      }

      return false;
    },
    {
      message:
        "Invalid chain id, must be one of: " +
        Object.keys(SUPPORTED_CHAINS).join(", "),
    },
  ),
});

const result = publicEnvSchema.safeParse({
  NEXT_PUBLIC_INDEXER_URL: process.env.NEXT_PUBLIC_INDEXER_URL,
  NEXT_PUBLIC_PINATA_GATEWAY_URL: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_APP_SIGNER_ADDRESS: process.env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
  NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS:
    process.env.NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
});

if (!result.success) {
  throw new Error(
    "Invalid public environment variables: \n\n" +
      JSON.stringify(result.error.format(), null, 2),
  );
}

export const publicEnv = result.data;
