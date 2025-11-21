import { LRUCache } from "lru-cache";
import { env } from "../env";
import {
  createENSByQueryResolver,
  type ENSByQueryResolverKey,
} from "../resolvers/ens-by-query-resolver";
import type { ResolvedENSData } from "../resolvers";
import { metrics } from "./metrics";

const cacheMap = new LRUCache<
  ENSByQueryResolverKey,
  Promise<ResolvedENSData[] | null>
>({
  max: 10000,
  ttl: 24 * 60 * 60 * 1000, // 1 day
  allowStale: true,
});

export const ensByQueryResolverService = createENSByQueryResolver({
  subgraphUrl: env.ENSNODE_SUBGRAPH_URL,
  cacheMap,
  metrics,
});
