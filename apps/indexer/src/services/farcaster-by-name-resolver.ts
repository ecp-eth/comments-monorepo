import { LRUCache } from "lru-cache";
import { createFarcasterByNameResolver } from "../resolvers/farcaster-by-name-resolver";
import { env } from "../env";
import { metrics } from "./metrics";
import type { FarcasterName, ResolvedFarcasterData } from "../resolvers";

// could also use redis
const cacheMap = new LRUCache<
  FarcasterName,
  Promise<ResolvedFarcasterData | null>
>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const farcasterByNameResolverService = createFarcasterByNameResolver({
  neynarApiKey: env.NEYNAR_API_KEY,
  cacheMap,
  metrics,
});
