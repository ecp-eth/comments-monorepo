import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_INDEXER_URL: z
    .string()
    .url()
    .default("https://api.ethcomments.xyz"),
});

const result = serverEnvSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    "Invalid server environment variables: \n\n" +
      JSON.stringify(result.error.format(), null, 2),
  );
}

export const serverEnv = result.data;
