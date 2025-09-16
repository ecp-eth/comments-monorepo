import DataLoader from "dataloader";
import { type Hex } from "viem";
import type {
  ResolvedERC20Data,
  ChainID,
  ERC20ClientRegistry,
} from "./erc20.types.ts";
import { ERC20TokensService } from "../services/erc20-tokens-service.ts";

export type ERC20ByTickerResolverKey = [string, ChainID];

export type ERC20ByTickerResolver = DataLoader<
  ERC20ByTickerResolverKey,
  ResolvedERC20Data | null
>;

async function resolveErc20Data(
  ticker: string,
  chainId: ChainID,
  clientRegistry: ERC20ClientRegistry,
  erc20TokensService: ERC20TokensService,
): Promise<ResolvedERC20Data | null> {
  const config = await clientRegistry.getClientByChainId(chainId);

  if (!config) {
    console.warn(`No client found for chainId ${chainId}`);
    return null;
  }

  const tokens = await erc20TokensService.load("");

  const token = tokens.find(
    (token) =>
      token.symbol.toLowerCase() === ticker.toLowerCase() &&
      token.chainId === chainId,
  );

  if (!token) {
    return null;
  }

  return {
    address: token.address as Hex,
    decimals: token.decimals,
    logoURI: token.logoURI,
    name: token.name,
    symbol: token.symbol,
    chains: [
      {
        caip: `eip155:${token.chainId}/erc20:${token.address}`,
        chainId,
      },
    ],
  };
}

export type ERC20ByTickerResolverOptions = {
  clientRegistry: ERC20ClientRegistry;
  erc20TokensService: ERC20TokensService;
} & DataLoader.Options<ERC20ByTickerResolverKey, ResolvedERC20Data | null>;

export function createERC20ByTickerResolver({
  clientRegistry,
  erc20TokensService,
  ...dataLoaderOptions
}: ERC20ByTickerResolverOptions): ERC20ByTickerResolver {
  return new DataLoader<ERC20ByTickerResolverKey, ResolvedERC20Data | null>(
    async (keys) => {
      return Promise.all(
        keys.map(([ticker, chainId]) =>
          resolveErc20Data(ticker, chainId, clientRegistry, erc20TokensService),
        ),
      );
    },
    dataLoaderOptions,
  );
}
