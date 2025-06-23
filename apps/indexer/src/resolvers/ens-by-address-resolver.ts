import {
  createENSByAddressResolver,
  type ENSByAddressResolver,
} from "@ecp.eth/shared/resolvers";
import { type Hex } from "viem";
import { env } from "../env";
import { LRUCache } from "lru-cache";
import type { ResolvedENSData } from "./types";

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export type { ENSByAddressResolver, ResolvedENSData };

export const ensByAddressResolver = createENSByAddressResolver({
  chainRpcUrl: env.ENS_RPC_URL,
  cacheMap,
});
