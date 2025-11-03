import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";

export const publicEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  NEXT_PUBLIC_RPC_URL_1: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_8453: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_11155111: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_84532: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_31337: z.string().url().optional(),
  NEXT_PUBLIC_APP_SIGNER_ADDRESS: HexSchema,
  NEXT_PUBLIC_WC_PROJECT_ID: z.string().nonempty(),
  NEXT_PUBLIC_COMMENTS_INDEXER_URL: z.string().url(),
  NEXT_PUBLIC_COMMENT_AUTHOR_URL: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_PINATA_GATEWAY_URL: z.string().nonempty(),
  NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL: z.string().nonempty(),
  NEXT_PUBLIC_ENABLE_GASLESS: z
    .enum(["1", "0"])
    .default("0")
    .transform((val) => val === "1"),
  NEXT_PUBLIC_SIGNER_API_URL: z.string().url(),
});

export const publicEnv = publicEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_RPC_URL_1: process.env.NEXT_PUBLIC_RPC_URL_1,
  NEXT_PUBLIC_RPC_URL_8453: process.env.NEXT_PUBLIC_RPC_URL_8453,
  NEXT_PUBLIC_RPC_URL_11155111: process.env.NEXT_PUBLIC_RPC_URL_11155111,
  NEXT_PUBLIC_RPC_URL_84532: process.env.NEXT_PUBLIC_RPC_URL_84532,
  NEXT_PUBLIC_RPC_URL_31337: process.env.NEXT_PUBLIC_RPC_URL_31337,
  NEXT_PUBLIC_APP_SIGNER_ADDRESS: process.env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
  NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  NEXT_PUBLIC_COMMENTS_INDEXER_URL:
    process.env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  NEXT_PUBLIC_COMMENT_AUTHOR_URL: process.env.NEXT_PUBLIC_COMMENT_AUTHOR_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_PINATA_GATEWAY_URL: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL,
  NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL:
    process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL,
  NEXT_PUBLIC_ENABLE_GASLESS: process.env.NEXT_PUBLIC_ENABLE_GASLESS,
  NEXT_PUBLIC_SIGNER_API_URL: process.env.NEXT_PUBLIC_SIGNER_API_URL,
});
