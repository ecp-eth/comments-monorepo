import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";
import { publicEnvSchema } from "./publicEnv";

class InvalidServerEnvVariablesError extends Error {
  constructor(private readonly validationError: z.ZodError) {
    super();
  }

  get message() {
    const message = `
Invalid environment variables:

${JSON.stringify(this.validationError.flatten(), null, 2)}
`.trim();

    return message;
  }
}

export const PrivySubmitterEnvSchema = z.object({
  PRIVY_WALLET_ADDRESS: HexSchema,
  PRIVY_WALLET_ID: z.string(),
  PRIVY_AUTHORIZATION_KEY: z.string(),
  PRIVY_APP_ID: z.string(),
  PRIVY_SECRET: z.string(),
});

export const EthSubmitterEnvSchema = z.object({
  SUBMITTER_PRIVATE_KEY: HexSchema,
});

export const SubmitterEnvSchema = z.union([
  PrivySubmitterEnvSchema,
  EthSubmitterEnvSchema,
]);

const EnableSwappingSchema = z.discriminatedUnion(
  "NEXT_PUBLIC_ENABLE_SWAPPING",
  [
    z.object({
      NEXT_PUBLIC_ENABLE_SWAPPING: z.literal(true),
      ZEROEX_API_KEY: z.string().nonempty(),
    }),
    z.object({
      NEXT_PUBLIC_ENABLE_SWAPPING: z.literal(false),
      ZEROEX_API_KEY: z.string().optional(),
    }),
  ],
);

const EnvSchema = z
  .object({
    APP_URL: z.string().url(),
    APP_SIGNER_PRIVATE_KEY: HexSchema,
    KV_REST_API_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().optional(),
    ZEROEX_API_KEY: z.string().optional(),
    NEXT_PUBLIC_ENABLE_SWAPPING: z
      .enum(["1", "0"])
      .default("0")
      .transform((val) => val === "1"),
    PINATA_JWT: z.string().nonempty(),
  })
  .merge(publicEnvSchema)
  .merge(EthSubmitterEnvSchema.partial())
  .merge(PrivySubmitterEnvSchema.partial())
  .refine((data) => {
    const submitterResult = SubmitterEnvSchema.safeParse(data);

    if (!submitterResult.success) {
      throw submitterResult.error;
    }

    const swapResult = EnableSwappingSchema.safeParse(data);

    if (!swapResult.success) {
      throw swapResult.error;
    }

    return true;
  });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends z.infer<typeof EnvSchema> {}
  }
}

const parseResult = EnvSchema.safeParse(process.env);

if (!parseResult.success) {
  throw new InvalidServerEnvVariablesError(parseResult.error);
}

export const env = parseResult.data;
