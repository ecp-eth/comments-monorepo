import DataLoader from "dataloader";
import { type Hex } from "viem";
import type { ResolvedERC20Data } from "./types";
import { LRUCache } from "lru-cache";
import { tokenList } from "@ecp.eth/shared/token-list";
import { erc20RpcClientsByChainId } from "./erc20-rpc-clients";

type ChainID = number;

type DataLoaderKey = [string, ChainID];

export type ERC20ByTickerResolver = DataLoader<
  DataLoaderKey,
  ResolvedERC20Data | null
>;

async function resolveErc20Data(
  ticker: string,
  chainId: ChainID,
): Promise<ResolvedERC20Data | null> {
  const config = erc20RpcClientsByChainId[chainId];

  if (!config) {
    return null;
  }

  const token = tokenList.find(
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
    caip19: token.caip19,
    chainId: token.chainId,
    url: config.tokenAddressURL(token.address as Hex),
  };
}

function createERC20ByTickerResolver(): ERC20ByTickerResolver {
  // could also use redis
  const cacheMap = new LRUCache<
    DataLoaderKey,
    Promise<ResolvedERC20Data | null>
  >({
    max: 10000,
    ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
    allowStale: true,
  });

  return new DataLoader<DataLoaderKey, ResolvedERC20Data | null>(
    async (keys) => {
      return Promise.all(
        keys.map(([ticker, chainId]) => resolveErc20Data(ticker, chainId)),
      );
    },
    {
      cacheMap,
    },
  );
}

export const erc20ByTickerResolver = createERC20ByTickerResolver();
