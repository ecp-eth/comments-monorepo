import { type Hex } from "viem";
import { env } from "../env.ts";
import { LRUCache } from "lru-cache";
import {
  createENSByAddressResolver,
  type ResolvedENSData,
} from "../resolvers/index.ts";
import { ensByQueryResolverService } from "./ens-by-query-resolver.ts";

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const ensByAddressResolverService = createENSByAddressResolver({
  chainRpcUrl: env.ENS_RPC_URL,
  cacheMap,
  ensByQueryResolver: ensByQueryResolverService,
});
