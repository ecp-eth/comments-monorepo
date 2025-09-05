import { LRUCache } from "lru-cache";
import { env } from "../env.ts";
import {
  createENSByQueryResolver,
  type ENSByQueryResolverKey,
  type ResolvedENSData,
} from "../resolvers/index.ts";

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
});
