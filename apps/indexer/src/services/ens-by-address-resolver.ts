import { type Hex } from "viem";
import { env } from "../env";
import { LRUCache } from "lru-cache";
import { ENSByAddressResolver } from "./resolvers/ens-by-address-resolver";
import { ensByQueryResolverService } from "./ens-by-query-resolver";
import { metrics } from "./metrics";
import type { ResolvedENSData } from "./resolvers/ens.types";
import { wrapServiceWithTracing } from "../telemetry";

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const ensByAddressResolverService = wrapServiceWithTracing(
  new ENSByAddressResolver({
    chainRpcUrl: env.ENS_RPC_URL,
    ensByQueryResolver: ensByQueryResolverService,
    metrics,
    cacheMap,
  }),
);
