import { LRUCache } from "lru-cache";
import { env } from "../env";
import {
  createERC20ByAddressResolver,
  ERC20ByAddressResolverKey,
  ResolvedERC20Data,
} from "../resolvers";

// could also use redis
const cacheMap = new LRUCache<
  ERC20ByAddressResolverKey,
  Promise<ResolvedERC20Data | null>
>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});
export const erc20ByAddressResolverService = createERC20ByAddressResolver({
  simApiKey: env.SIM_API_KEY,
  cacheMap,
});
