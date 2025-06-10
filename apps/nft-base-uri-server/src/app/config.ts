import * as chains from "viem/chains";
import { z } from "zod";

const chainsById = Object.values(chains).reduce(
  (acc, chain) => {
    acc[chain.id] = chain;

    return acc;
  },
  {} as Record<string, chains.Chain>,
);

export type ChainConfig = {
  chain: chains.Chain;
  rpcUrl: string;
};

const envVariables = z
  .object({
    ALLOWED_CHAIN_IDS: z.preprocess(
      (val) => {
        return typeof val === "string" ? val.split(",") : val;
      },
      z.array(z.enum(Object.keys(chainsById) as [string, ...string[]])).min(1),
    ),
  })
  .transform((data, ctx) => {
    const chains: Record<number, ChainConfig> = {};
    let defaultChain: ChainConfig | undefined;
    let hasInvalidConfig = false;

    for (const allowedChainId of data.ALLOWED_CHAIN_IDS) {
      const envVariable = `RPC_URL_${allowedChainId}`;

      const rpcUrlResult = z.string().url().safeParse(process.env[envVariable]);

      if (!rpcUrlResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `RPC_URL_${allowedChainId} is not a valid URL`,
          path: [envVariable],
        });

        hasInvalidConfig = true;

        continue;
      }

      const chain = chainsById[allowedChainId];

      chains[chain.id] = {
        chain,
        rpcUrl: rpcUrlResult.data,
      };

      if (!defaultChain) {
        defaultChain = chains[chain.id];
      }
    }

    if (hasInvalidConfig) {
      return z.NEVER;
    }

    if (!defaultChain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No default chain found",
        path: ["ALLOWED_CHAIN_IDS"],
      });

      return z.NEVER;
    }

    return {
      ...data,
      chains,
      defaultChain,
    };
  })
  .safeParse(process.env);

if (!envVariables.success) {
  console.error(envVariables.error.flatten().fieldErrors);

  throw new Error("Invalid environment variables");
}

export const config = envVariables.data;
