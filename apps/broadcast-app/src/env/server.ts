import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

const serverEnvSchema = z.object({
  FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_HEADER: z.string().nonempty(),
  FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_PAYLOAD: z
    .string()
    .nonempty(),
  FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_SIGNATURE: z
    .string()
    .nonempty(),
  FARCASTER_MINI_APP_NAME: z.string().nonempty().max(32),
  FARCASTER_MINI_APP_WEBHOOK_URL: z.string().url(),
  FARCASTER_MINI_APP_URL: z.string().url(),
  PINATA_JWT: z.string().nonempty(),
  PRIVATE_RPC_URL: z.string().url(),
  COMMENT_CONTENT_LENGTH_LIMIT: z.number().int().positive().default(10240),
  APP_SIGNER_PRIVATE_KEY: HexSchema,
  BROADCAST_APP_INDEXER_URL: z.string().url(),
});

const result = serverEnvSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    "Invalid server environment variables: \n\n" +
      JSON.stringify(result.error.format(), null, 2),
  );
}

export const serverEnv = result.data;
