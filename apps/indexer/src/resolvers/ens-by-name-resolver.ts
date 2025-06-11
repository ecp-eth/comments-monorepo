import {
  createENSByNameResolver,
  type ENSByNameResolver,
} from "@ecp.eth/shared/resolvers";
import { type Hex } from "viem";
import type { ResolvedENSData } from "./types";
import { LRUCache } from "lru-cache";
import { env } from "../env";

export type { ENSByNameResolver };

const cacheMap = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const ensByNameResolver = createENSByNameResolver({
  chainRpcUrl: env.ENS_RPC_URL,
  cacheMap,
});
