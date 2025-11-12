import DataLoader from "dataloader";
import type { Hex } from "viem";
import type { ChainID, ResolvedERC20Data } from "./erc20.types.ts";
import { SUPPORTED_CHAIN_IDS } from "../env.ts";
import {
  type SIMAPITokenInfoSchemaType,
  type ISIMAPIService,
} from "../services/types.ts";

export type ERC20ByAddressResolverKey = [Hex] | [Hex, ChainID];

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
  ResolvedERC20Data | null,
  string
>;

export type ERC20ByAddressResolverOptions = {
  simAPIService: ISIMAPIService;
} & Omit<
  DataLoader.Options<
    ERC20ByAddressResolverKey,
    ResolvedERC20Data | null,
    string
  >,
  "batchLoadFn" | "maxBatchSize" | "cacheKeyFn"
>;

export function createERC20ByAddressResolver({
  simAPIService,
  ...dataLoaderOptions
}: ERC20ByAddressResolverOptions): ERC20ByAddressResolver {
  return new DataLoader<
    ERC20ByAddressResolverKey,
    ResolvedERC20Data | null,
    string
  >(
    async (addressAndChainIds) => {
      if (!addressAndChainIds.length) {
        return [];
      }

      return Promise.all(
        addressAndChainIds.map(
          async ([address, chainId]): Promise<ResolvedERC20Data | null> => {
            const tokensInfos: SIMAPITokenInfoSchemaType[] =
              await simAPIService.getTokenInfo(
                address,
                chainId ? [chainId] : chainsIdToSearch,
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
              logoURI: firstTokenInfo.logo ?? null,
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
        return (
          chainId
            ? [address.toLowerCase() as Hex, chainId]
            : [address.toLowerCase() as Hex]
        ).join(":");
      },
    },
  );
}
