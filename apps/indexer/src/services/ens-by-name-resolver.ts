import { type Hex } from "viem";
import { LRUCache } from "lru-cache";
import { env } from "../env";
import type { ResolvedENSData } from "./resolvers/ens.types";
import { metrics } from "./metrics";
import { wrapServiceWithTracing } from "../telemetry";
import { ENSByNameResolver } from "./resolvers/ens-by-name-resolver";

const cacheMap = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
  max: 10000,
  ttl: 24 * 60 * 60 * 1000, // 1 day
  allowStale: true,
});

export const ensByNameResolverService = wrapServiceWithTracing(
  new ENSByNameResolver({
    chainRpcUrl: env.ENS_RPC_URL,
    metrics,
    cacheMap,
  }),
);
