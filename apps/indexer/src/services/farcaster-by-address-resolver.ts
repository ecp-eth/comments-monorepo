import { type Hex } from "viem";
import { LRUCache } from "lru-cache";

import { env } from "../env.ts";
import {
  createFarcasterByAddressResolver,
  type ResolvedFarcasterData,
} from "../resolvers/index.ts";

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedFarcasterData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const farcasterByAddressResolverService =
  createFarcasterByAddressResolver({
    neynarApiKey: env.NEYNAR_API_KEY,
    cacheMap,
  });
