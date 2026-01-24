import { LRUCache } from "lru-cache";
import { env } from "../env";
import {
  ENSByQueryResolver,
  type ENSByQueryResolverKey,
} from "./resolvers/ens-by-query-resolver";
import type { ResolvedENSData } from "./resolvers/ens.types";
import { metrics } from "./metrics";
import { wrapServiceWithTracing } from "../telemetry";

const cacheMap = new LRUCache<
  ENSByQueryResolverKey,
  Promise<ResolvedENSData[] | null>
>({
  max: 10000,
  ttl: 24 * 60 * 60 * 1000, // 1 day
  allowStale: true,
});

export const ensByQueryResolverService = wrapServiceWithTracing(
  new ENSByQueryResolver({
    subgraphUrl: env.ENSNODE_SUBGRAPH_URL,
    cacheMap,
    metrics,
  }),
);
