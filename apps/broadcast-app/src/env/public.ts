import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_INDEXER_URL: z.string().url().optional(),
  NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL: z.string().url(),
});

const result = publicEnvSchema.safeParse({
  NEXT_PUBLIC_INDEXER_URL: process.env.NEXT_PUBLIC_INDEXER_URL,
  NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL:
    process.env.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
});

if (!result.success) {
  throw new Error(
    "Invalid public environment variables: \n\n" +
      JSON.stringify(result.error.format(), null, 2),
  );
}

export const publicEnv = result.data;
