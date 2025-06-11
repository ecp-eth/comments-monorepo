import DataLoader from "dataloader";
import type { ResolvedERC20Data, ERC20ClientRegistry } from "./erc20.types";
import { tokenList } from "../token-list";
import { Hex } from "viem";

export type ERC20ByQueryResolver = DataLoader<string, ResolvedERC20Data[]>;

export type ERC20ByQueryResolverOptions = {
  /**
   * How many results to return for each query.
   *
   * @default 10
   */
  limit?: number;
  clientRegistry: ERC20ClientRegistry;
} & DataLoader.Options<string, ResolvedERC20Data[]>;

export function createERC20ByQueryResolver({
  limit = 10,
  clientRegistry,
  ...dataLoaderOptions
}: ERC20ByQueryResolverOptions): ERC20ByQueryResolver {
  return new DataLoader<string, ResolvedERC20Data[]>(
    async (keys) => {
      return Promise.all(
        keys.map(async (query) => {
          const queryLower = query.toLowerCase();

          const results: ResolvedERC20Data[] = [];

          for (const token of tokenList) {
            const client = await clientRegistry.getClientByChainId(
              token.chainId,
            );

            if (!client) {
              continue;
            }

            if (
              token.symbol.toLowerCase().includes(queryLower) ||
              token.name.toLowerCase().includes(queryLower)
            ) {
              results.push({
                ...token,
                address: token.address as Hex,
                url: client.tokenAddressURL(token.address as Hex),
              });
            }

            if (results.length >= limit) {
              break;
            }
          }

          return results;
        }),
      );
    },
    {
      cache: false,
      ...dataLoaderOptions,
    },
  );
}
