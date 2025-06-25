import { LRUCache } from "lru-cache";
import {
  createFarcasterByNameResolver,
  type FarcasterName,
  type ResolvedFarcasterData,
} from "../resolvers";
import { env } from "../env";

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
});
