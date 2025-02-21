import { HexSchema } from "@ecp.eth/sdk/schemas";
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
  APP_SIGNER_PRIVATE_KEY: HexSchema,
  NEXT_PUBLIC_APP_SIGNER_ADDRESS: HexSchema,
  NEXT_PUBLIC_COMMENTS_INDEXER_URL: z.string().url(),
  NEXT_PUBLIC_WC_PROJECT_ID: z.string(),
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends z.infer<typeof ServerEnvSchema> {}
  }
}

const envParseResult = ServerEnvSchema.safeParse(process.env);

if (!envParseResult.success) {
  throw new InvalidServerEnvVariablesError(envParseResult.error);
}

export const env = envParseResult.data;
