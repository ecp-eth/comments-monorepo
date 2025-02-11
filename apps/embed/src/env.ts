import { z } from "zod";

class InvalidServerEnvVariablesError extends Error {
  constructor(private validationError: z.ZodError) {
    super();
  }

  toString() {
    const message = `
Invalid environment variables:

${JSON.stringify(this.validationError.flatten(), null, 2)}
`.trim();

    return message;
  }
}

const ServerEnvSchema = z.object({
  APP_SIGNER_PRIVATE_KEY: z.custom<`0x${string}`>(
    (value) =>
      z
        .string()
        .regex(/^0x[0-9a-fA-F]+$/)
        .safeParse(value).success
  ),
  COMMENTS_INDEXER_URL: z.string().url(),
  NEXT_PUBLIC_WC_PROJECT_ID: z.string(),
});

const envParseResult = ServerEnvSchema.safeParse(process.env);

if (!envParseResult.success) {
  throw new InvalidServerEnvVariablesError(envParseResult.error);
}

export const env = envParseResult.data;
