/* eslint-disable turbo/no-undeclared-env-vars */
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

export const publicEnvSchema = z.object({
  EXPO_PUBLIC_CHAIN: z.enum(["base", "anvil"]),
  EXPO_PUBLIC_REOWN_APP_ID: z.string().min(1),
  EXPO_PUBLIC_SIGNER_API_URL: z.string().url(),
  EXPO_PUBLIC_TARGET_URI: z.string().url(),
  EXPO_PUBLIC_APP_SIGNER_ADDRESS: HexSchema.optional(),
  EXPO_PUBLIC_INDEXER_URL: z.string().url(),
  EXPO_PUBLIC_DEMO_API_URL: z.string().url(),
  EXPO_PUBLIC_RPC_URL: z.string().url(),
  EXPO_PUBLIC_COMMENT_AUTHOR_URL: z.string().url().optional(),
  EXPO_PUBLIC_PINATA_HOST: z.string(),
});

export const publicEnv = publicEnvSchema.parse({
  EXPO_PUBLIC_CHAIN: process.env.EXPO_PUBLIC_CHAIN,
  EXPO_PUBLIC_REOWN_APP_ID: process.env.EXPO_PUBLIC_REOWN_APP_ID,
  EXPO_PUBLIC_SIGNER_API_URL: process.env.EXPO_PUBLIC_SIGNER_API_URL,
  EXPO_PUBLIC_TARGET_URI: process.env.EXPO_PUBLIC_TARGET_URI,
  EXPO_PUBLIC_APP_SIGNER_ADDRESS: process.env.EXPO_PUBLIC_APP_SIGNER_ADDRESS,
  EXPO_PUBLIC_INDEXER_URL: process.env.EXPO_PUBLIC_INDEXER_URL,
  EXPO_PUBLIC_DEMO_API_URL: process.env.EXPO_PUBLIC_DEMO_API_URL,
  EXPO_PUBLIC_RPC_URL: process.env.EXPO_PUBLIC_RPC_URL,
  EXPO_PUBLIC_COMMENT_AUTHOR_URL: process.env.EXPO_PUBLIC_COMMENT_AUTHOR_URL,
  EXPO_PUBLIC_PINATA_HOST: process.env.EXPO_PUBLIC_PINATA_HOST,
});
