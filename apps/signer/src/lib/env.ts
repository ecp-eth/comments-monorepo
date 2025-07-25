import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";

export function getRpcUrl(chainId: number) {
  return process.env[`RPC_URL_${chainId}`];
}

export const ChainIdSchema = z.coerce.number().transform((val, ctx) => {
  if (val in SUPPORTED_CHAINS) {
    return val as keyof typeof SUPPORTED_CHAINS;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Invalid chain ID: ${val}`,
    path: ctx.path,
  });

  return z.NEVER;
});

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

// Required environment variables for basic signing
const BaseEnvSchema = z.object({
  APP_SIGNER_PRIVATE_KEY: HexSchema.optional(),
  ENABLED_CHAINS: z.preprocess((val) => {
    if (typeof val === "string") {
      return val.split(",").map(Number);
    }

    return val;
  }, z.array(ChainIdSchema).min(1)),
  DEFAULT_CHAIN_ID: ChainIdSchema,
  COMMENTS_INDEXER_URL: z.string().url().optional(),
});

const PrivateKeyGaslessEnvSchema = BaseEnvSchema.extend({
  GASLESS_METHOD: z.literal("private-key"),
  GASLESS_APP_SIGNER_PRIVATE_KEY: HexSchema.optional(),
  GASLESS_SUBMITTER_PRIVATE_KEY: HexSchema,
});

const PrivyGaslessEnvSchema = BaseEnvSchema.extend({
  GASLESS_METHOD: z.literal("privy"),
  GASLESS_PRIVY_APP_SIGNER_PRIVATE_KEY: HexSchema.optional(),
  GASLESS_PRIVY_APP_ID: z.string().nonempty(),
  GASLESS_PRIVY_SECRET: z.string().nonempty(),
  GASLESS_PRIVY_AUTHORIZATION_KEY: z.string().nonempty(),
  GASLESS_PRIVY_WALLET_ADDRESS: HexSchema,
  GASLESS_PRIVY_WALLET_ID: z.string().nonempty(),
});

const DisabledGaslessEnvSchema = BaseEnvSchema.extend({
  GASLESS_METHOD: z.never().optional(),
});

const EnvSchema = z
  .discriminatedUnion("GASLESS_METHOD", [
    PrivateKeyGaslessEnvSchema,
    PrivyGaslessEnvSchema,
    DisabledGaslessEnvSchema,
  ])
  .superRefine((val, ctx) => {
    if (!val.ENABLED_CHAINS.includes(val.DEFAULT_CHAIN_ID)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Default chain ${val.DEFAULT_CHAIN_ID} is not enabled`,
        path: ["DEFAULT_CHAIN_ID"],
      });
    }

    for (const chainId of val.ENABLED_CHAINS) {
      if (!z.string().url().safeParse(getRpcUrl(chainId)).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `RPC URL for chain ${chainId} is not set`,
          path: [`RPC_URL_${chainId}`],
        });
      }
    }
  });

const parseResult = EnvSchema.safeParse(process.env);

if (!parseResult.success) {
  throw new InvalidServerEnvVariablesError(parseResult.error);
}

export const env = parseResult.data;

export const AllowedChainIdSchema = z.coerce.number().transform((val, ctx) => {
  if (env.ENABLED_CHAINS.includes(val as keyof typeof SUPPORTED_CHAINS)) {
    return val as keyof typeof SUPPORTED_CHAINS;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Chain ${val} is not supported`,
    path: ctx.path,
  });

  return z.NEVER;
});
