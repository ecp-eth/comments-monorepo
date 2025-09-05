import { type Hex } from "viem";
import { LRUCache } from "lru-cache";
import { env } from "../env.ts";
import {
  createENSByNameResolver,
  type ResolvedENSData,
} from "../resolvers/index.ts";

const cacheMap = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
  max: 10000,
  ttl: 24 * 60 * 60 * 1000, // 1 day
  allowStale: true,
});

export const ensByNameResolverService = createENSByNameResolver({
  chainRpcUrl: env.ENS_RPC_URL,
  cacheMap,
});
