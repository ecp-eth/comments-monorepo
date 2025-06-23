import {
  createERC20ByAddressResolver,
  type ERC20ByAddressResolver,
  type ERC20ByAddressResolverKey,
  type ResolvedERC20Data,
} from "@ecp.eth/shared/resolvers";
import { LRUCache } from "lru-cache";
import { env } from "../env";

export type { ERC20ByAddressResolver };

// could also use redis
const cacheMap = new LRUCache<
  ERC20ByAddressResolverKey,
  Promise<ResolvedERC20Data | null>
>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});
export const erc20ByAddressResolver = createERC20ByAddressResolver({
  simApiKey: env.SIM_API_KEY,
  cacheMap,
});
