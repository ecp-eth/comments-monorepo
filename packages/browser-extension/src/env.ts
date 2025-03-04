import { HexSchema } from "@ecp.eth/sdk/schemas";
import { z } from "zod";

export const envSchema = z.object({
  PLASMO_PUBLIC_WC_PROJECT_ID: z.string(),
  PLASMO_PUBLIC_COMMENTS_INDEXER_URL: z.string().url(),
  PLASMO_PUBLIC_APP_SIGNER_ADDRESS: HexSchema,
  PLASMO_PUBLIC_BASE_RPC_URL: z.string().url().optional(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

const _env = envSchema.safeParse({
  // we can't use process.env directly because plasmo inlines only the variables prefixed with PLASMO_
  PLASMO_PUBLIC_WC_PROJECT_ID: process.env.PLASMO_PUBLIC_WC_PROJECT_ID,
  PLASMO_PUBLIC_COMMENTS_INDEXER_URL:
    process.env.PLASMO_PUBLIC_COMMENTS_INDEXER_URL,
  PLASMO_PUBLIC_APP_SIGNER_ADDRESS:
    process.env.PLASMO_PUBLIC_APP_SIGNER_ADDRESS,
});

if (_env.success === false) {
  console.error("Invalid environment variables: \n", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
