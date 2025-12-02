import type { ResolvedERC20Data, ERC20ClientRegistry } from "./erc20.types.ts";
import { type Hex } from "viem";
import { DataLoader, type DataLoaderOptions } from "../dataloader";
import { type ERC20TokensService } from "../erc20-tokens-service";

export type ERC20ByQueryResolverOptions = {
  /**
   * How many results to return for each query.
   *
   * @default 10
   */
  limit?: number;
  clientRegistry: ERC20ClientRegistry;
  erc20TokensService: ERC20TokensService;
} & Omit<DataLoaderOptions<string, ResolvedERC20Data[]>, "name">;

export class ERC20ByQueryResolver extends DataLoader<
  string,
  ResolvedERC20Data[]
> {
  constructor({
    limit = 10,
    clientRegistry,
    erc20TokensService,
    ...dataLoaderOptions
  }: ERC20ByQueryResolverOptions) {
    super(
      async (keys) => {
        return Promise.all(
          keys.map(async (query) => {
            const queryLower = query.toLowerCase();

            const results: ResolvedERC20Data[] = [];

            const tokens = await erc20TokensService.load("");

            for (const token of tokens) {
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
                  chains: [
                    {
                      caip: token.caip19,
                      chainId: token.chainId,
                    },
                  ],
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
        ...dataLoaderOptions,
        name: "ERC20ByQueryResolver",
      },
    );
  }
}
