import DataLoader from "dataloader";
import type { Hex } from "viem";
import type { ChainID, ResolvedERC20Data } from "./erc20.types.ts";
import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { SUPPORTED_CHAIN_IDS } from "../env.ts";

export type ERC20ByAddressResolverKey = [Hex] | [Hex, ChainID];

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

// this array contains all supported chain ids + ethereum mainnet
// this is the chains we want to check for token info IF CHAIN ID IS NOT PROVIDED by the caller
const chainsIdToSearch = Array.from(new Set([1, ...SUPPORTED_CHAIN_IDS]));

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
  "batchLoadFn" | "maxBatchSize" | "cacheKeyFn"
>;

export function createERC20ByAddressResolver({
  simApiKey,
  ...dataLoaderOptions
}: ERC20ByAddressResolverOptions): ERC20ByAddressResolver {
  return new DataLoader<ERC20ByAddressResolverKey, ResolvedERC20Data | null>(
    async (addressAndChainIds) => {
      if (!addressAndChainIds.length) {
        return [];
      }

      return Promise.all(
        addressAndChainIds.map(
          async ([address, chainId]): Promise<ResolvedERC20Data | null> => {
            const tokensInfos: TokenInfo[] = await getTokenInfo(
              address,
              chainId ? [chainId] : chainsIdToSearch,
              simApiKey,
            );

            const chainIds = new Set<ChainID>();

            for (const tokenInfo of tokensInfos) {
              chainIds.add(tokenInfo.chain_id);
            }

            const firstTokenInfo = tokensInfos[0];

            if (!firstTokenInfo) {
              return null;
            }

            return {
              address,
              logoURI: firstTokenInfo.logo,
              symbol: firstTokenInfo.symbol,
              name: firstTokenInfo.name || firstTokenInfo.symbol,
              decimals: firstTokenInfo.decimals,
              chains: Array.from(chainIds).map((chainId) => ({
                caip: `eip155:${chainId}/erc20:${address}`,
                chainId,
              })),
            };
          },
        ),
      );
    },
    {
      ...dataLoaderOptions,
      cacheKeyFn([address, chainId]) {
        if (chainId) {
          return [address.toLowerCase() as Hex, chainId];
        }

        return [address.toLowerCase() as Hex];
      },
    },
  );
}

async function getTokenInfo(
  address: Hex,
  chainIds: ChainID[],
  simApiKey: string,
): Promise<TokenInfo[]> {
  const tokenInfos: TokenInfo[] = [];

  await Promise.all(
    chainIds.map(async (chainId) => {
      const url = new URL(`${address}`, SIM_TOKEN_INFO_URL);
      url.searchParams.set("chain_ids", chainId.toString());

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

      const parseResult = SimResponseSchema.safeParse(await response.json());

      if (!parseResult.success) {
        // should throw an error if it happens so it can be marked as failed and retried
        throw new SimApiError("Failed to parse SIM response", response);
      }

      for (const token of parseResult.data.tokens) {
        const tokenInfoResult = TokenInfoSchema.safeParse(token);

        if (!tokenInfoResult.success) {
          continue;
        }

        tokenInfos.push(tokenInfoResult.data);
      }
    }),
  );

  return tokenInfos;
}
