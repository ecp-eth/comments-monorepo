import { LRUCache } from "lru-cache";
import {
  createURLResolver,
  type ResolvedURL,
} from "../resolvers/url-resolver.ts";

const cacheMap = new LRUCache<string, Promise<ResolvedURL | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const urlResolverService = createURLResolver({
  cacheMap,
});
