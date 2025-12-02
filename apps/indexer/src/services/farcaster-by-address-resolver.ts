import { type Hex } from "viem";
import { LRUCache } from "lru-cache";

import { env } from "../env";
import { FarcasterByAddressResolver } from "./resolvers/farcaster-by-address-resolver";
import { metrics } from "./metrics";
import type { ResolvedFarcasterData } from "./resolvers/farcaster.types";
import { wrapServiceWithTracing } from "../telemetry";

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedFarcasterData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const farcasterByAddressResolverService = wrapServiceWithTracing(
  new FarcasterByAddressResolver({
    neynarApiKey: env.NEYNAR_API_KEY,
    cacheMap,
    metrics,
  }),
);
