import {
  createCAIP373QuotedCommentResolver,
  type CAIP373QuotedCommentResolverResult,
} from "./resolvers/caip373-quoted-comment-resolver";
import { LRUCache } from "lru-cache";
import config from "../../ponder.config";
import { commentByIdResolverService } from "./comment-by-id-resolver";
import { metrics } from "./metrics";

const cacheMap = new LRUCache<
  string,
  Promise<CAIP373QuotedCommentResolverResult | null>
>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const caip373QuotedCommentResolverService =
  createCAIP373QuotedCommentResolver({
    chains: config.chains,
    cacheMap,
    commentByIdResolver: commentByIdResolverService,
    metrics,
  });
