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
  NEXT_PUBLIC_EFP_ACCOUNT_METADATA_ADDRESS: HexSchema.default(
    "0x5289fE5daBC021D02FDDf23d4a4DF96F4E0F17EF",
  ),
  NEXT_PUBLIC_EFP_LIST_REGISTRY_ADDRESS: HexSchema.default(
    "0x0E688f5DCa4a0a4729946ACbC44C792341714e08",
  ),
  NEXT_PUBLIC_EFP_LIST_MINTER_ADDRESS: HexSchema.default(
    "0xDb17Bfc64aBf7B7F080a49f0Bbbf799dDbb48Ce5",
  ),
  NEXT_PUBLIC_EFP_LIST_RECORDS_ADDRESS: HexSchema.default(
    "0x41Aa48Ef3c0446b46a5b1cc6337FF3d3716E2A33",
  ),
  NEXT_PUBLIC_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE: HexSchema.optional(),
  NEXT_PUBLIC_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE: HexSchema.optional(),
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
  NEXT_PUBLIC_EFP_ACCOUNT_METADATA_ADDRESS:
    process.env.NEXT_PUBLIC_EFP_ACCOUNT_METADATA_ADDRESS,
  NEXT_PUBLIC_EFP_LIST_REGISTRY_ADDRESS:
    process.env.NEXT_PUBLIC_EFP_LIST_REGISTRY_ADDRESS,
  NEXT_PUBLIC_EFP_LIST_MINTER_ADDRESS:
    process.env.NEXT_PUBLIC_EFP_LIST_MINTER_ADDRESS,
  NEXT_PUBLIC_EFP_LIST_RECORDS_ADDRESS:
    process.env.NEXT_PUBLIC_EFP_LIST_RECORDS_ADDRESS,
  NEXT_PUBLIC_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE:
    process.env.NEXT_PUBLIC_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE,
  NEXT_PUBLIC_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE:
    process.env.NEXT_PUBLIC_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE,
});

if (!result.success) {
  throw new Error(
    "Invalid public environment variables: \n\n" +
      JSON.stringify(result.error.format(), null, 2),
  );
}

export const publicEnv = result.data;
