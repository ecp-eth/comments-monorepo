import DataLoader from "dataloader";
import type { Hex } from "viem";
import type { ChainID, ResolvedERC20Data } from "./erc20.types";
import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";

export type ERC20ByAddressResolverKey = Hex;

const TokenInfoSchema = z.object({
  chain_id: z.number().int().positive(),
  chain: z.string(),
  price_usd: z.number().nullish(),
  pool_size: z.number(),
  total_supply: z.coerce.bigint().nullish(),
  fully_diluted_value: z.number().nullish(),
  symbol: z.string(),
  name: z.string().nullable(),
  decimals: z.number().int().positive(),
  logo: z.string().url().nullable(),
});

type TokenInfo = z.infer<typeof TokenInfoSchema>;

const SimResponseSchema = z.object({
  contract_address: HexSchema,
  tokens: z.array(z.record(z.string(), z.unknown())),
});

const SIM_TOKEN_INFO_URL = "https://api.sim.dune.com/v1/evm/token-info/";

export class SimApiError extends Error {
  constructor(
    message: string,
    readonly response: Response,
  ) {
    super(message);
    this.name = "SimApiError";
  }
}

export type ERC20ByAddressResolver = DataLoader<
  ERC20ByAddressResolverKey,
  ResolvedERC20Data | null
>;

export type ERC20ByAddressResolverOptions = {
  simApiKey: string;
} & Omit<
  DataLoader.Options<ERC20ByAddressResolverKey, ResolvedERC20Data | null>,
  "batchLoadFn" | "maxBatchSize"
>;

export function createERC20ByAddressResolver({
  simApiKey,
  ...dataLoaderOptions
}: ERC20ByAddressResolverOptions): ERC20ByAddressResolver {
  return new DataLoader<ERC20ByAddressResolverKey, ResolvedERC20Data | null>(
    async (addresses) => {
      if (!addresses.length) {
        return [];
      }

      return Promise.all(
        addresses.map(async (address): Promise<ResolvedERC20Data | null> => {
          const url = new URL(`${address}`, SIM_TOKEN_INFO_URL);

          url.searchParams.set("chain_ids", "all");

          const response = await fetch(url, {
            headers: {
              "X-Sim-Api-Key": simApiKey,
            },
          });

          if (!response.ok) {
            throw new SimApiError(
              `Failed to fetch token info for ${address}`,
              response,
            );
          }

          const parseResult = SimResponseSchema.safeParse(
            await response.json(),
          );

          if (!parseResult.success) {
            return null;
          }

          const chainIds = new Set<ChainID>();
          const tokens: TokenInfo[] = [];

          for (const token of parseResult.data.tokens) {
            const tokenInfoResult = TokenInfoSchema.safeParse(token);

            if (!tokenInfoResult.success) {
              continue;
            }

            chainIds.add(tokenInfoResult.data.chain_id);
            tokens.push(tokenInfoResult.data);
          }

          if (tokens.length === 0) {
            return null;
          }

          return {
            address: parseResult.data.contract_address,
            logoURI: tokens[0]!.logo,
            symbol: tokens[0]!.symbol,
            name: tokens[0]!.name || tokens[0]!.symbol,
            decimals: tokens[0]!.decimals,
            chains: Array.from(chainIds).map((chainId) => ({
              caip: `eip155:${chainId}/erc20:${parseResult.data.contract_address}`,
              chainId,
            })),
          };
        }),
      );
    },
    dataLoaderOptions,
  );
}
