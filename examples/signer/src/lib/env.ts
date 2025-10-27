import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAINS } from "@ecp.eth/sdk";

export function getRpcUrl(chainId: number): string {
  const rpcUrl = process.env[`RPC_URL_${chainId}`];
  if (!rpcUrl) {
    throw new Error(`RPC URL for chain ${chainId} is not set`);
  }
  return rpcUrl;
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
  ENABLED_CHAINS: z
    .preprocess((val) => {
      if (typeof val === "string") {
        return val.split(",").map(Number);
      }

      return val;
    }, z.array(ChainIdSchema).min(1))
    // default to base mainnet since indexer supports it,
    // also this makes vercel 1 click deployment env var configuration easier
    // the user only need to specify RPC url to make it deployed
    .default([DEFAULT_CHAIN_ID]),
  DEFAULT_CHAIN_ID: ChainIdSchema.default(DEFAULT_CHAIN_ID),
  COMMENTS_INDEXER_URL: z.string().url().optional(),
  COMMENT_CONTENT_LENGTH_LIMIT: z.coerce.number().min(1).default(10240),
  TARGET_URI_REGEX: z
    .string()
    .refine(
      (val) => {
        try {
          new RegExp(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "TARGET_URI_REGEX must be a valid regular expression" },
    )
    .optional(),

  // Rate limiter environment variables
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  RATE_LIMITER_NAMESPACE: z.string().optional(),
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
