import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";
import { publicEnvSchema } from "./publicEnv";

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

// Eth submitter schema
export const SubmitterEnvSchema = z.object({
  SUBMITTER_PRIVATE_KEY: HexSchema,
});

const ServerEnvSchema = z
  .object({
    APP_SIGNER_PRIVATE_KEY: HexSchema,
    KV_REST_API_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    PINATA_JWT: z.string().nonempty(),
    COMMENT_CONTENT_LENGTH_LIMIT: z.coerce.number().default(1024 * 10),
    // Gasless mode configuration
    GASLESS_ENABLED: z
      .enum(["1", "0"])
      .default("0")
      .transform((val) => val === "1"),
  })
  .merge(publicEnvSchema)
  .merge(SubmitterEnvSchema.partial())
  .refine((data) => {
    // If gasless is enabled, require submitter configuration
    if (data.GASLESS_ENABLED) {
      const submitterResult = SubmitterEnvSchema.safeParse(data);
      if (!submitterResult.success) {
        throw submitterResult.error;
      }
    }
    return true;
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
