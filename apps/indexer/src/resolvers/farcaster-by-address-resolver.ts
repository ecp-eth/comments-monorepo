import {
  createFarcasterByAddressResolver,
  type ResolvedFarcasterData,
} from "@ecp.eth/shared/resolvers";
import { type Hex } from "viem";
import { LRUCache } from "lru-cache";

import { env } from "../env";

export type {
  ResolvedFarcasterData,
  FarcasterByAddressResolver,
} from "@ecp.eth/shared/resolvers";

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedFarcasterData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const farcasterByAddressResolver = createFarcasterByAddressResolver({
  neynarApiKey: env.NEYNAR_API_KEY,
  cacheMap,
});
