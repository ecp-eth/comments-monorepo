import { LRUCache } from "lru-cache";
import { createERC20ByAddressResolver } from "./resolvers/erc20-by-address-resolver";
import { simAPIService } from "./sim-api-service";
import { metrics } from "./metrics";
import type { ResolvedERC20Data } from "./resolvers/erc20.types";

// could also use redis
const cacheMap = new LRUCache<string, Promise<ResolvedERC20Data | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});
export const erc20ByAddressResolverService = createERC20ByAddressResolver({
  simAPIService,
  cacheMap,
  metrics,
});
