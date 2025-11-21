import { LRUCache } from "lru-cache";
import { erc20RpcClientsRegistryService } from "./erc20-rpc-clients-registry";
import {
  createERC20ByTickerResolver,
  type ERC20ByTickerResolverKey,
} from "./resolvers/erc20-by-ticker-resolver";
import { erc20TokensService } from "./erc20-tokens-service";
import { metrics } from "./metrics";
import type { ResolvedERC20Data } from "./resolvers/erc20.types";

// could also use redis
const cacheMap = new LRUCache<
  ERC20ByTickerResolverKey,
  Promise<ResolvedERC20Data | null>
>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const erc20ByTickerResolverService = createERC20ByTickerResolver({
  clientRegistry: erc20RpcClientsRegistryService,
  erc20TokensService: erc20TokensService,
  cacheMap,
  metrics,
});
