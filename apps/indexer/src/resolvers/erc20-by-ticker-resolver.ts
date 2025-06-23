import {
  createERC20ByTickerResolver,
  type ERC20ByTickerResolver,
  type ERC20ByTickerResolverKey,
  type ResolvedERC20Data,
} from "@ecp.eth/shared/resolvers";
import { LRUCache } from "lru-cache";
import { erc20RpcClientsRegistry } from "./erc20-rpc-clients-registry";

export type { ERC20ByTickerResolver };

// could also use redis
const cacheMap = new LRUCache<
  ERC20ByTickerResolverKey,
  Promise<ResolvedERC20Data | null>
>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const erc20ByTickerResolver = createERC20ByTickerResolver({
  clientRegistry: erc20RpcClientsRegistry,
  cacheMap,
});
