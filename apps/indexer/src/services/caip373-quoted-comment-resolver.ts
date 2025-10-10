import { createCAIP373QuotedCommentResolver } from "../resolvers/caip373-quoted-comment-resolver.ts";
import { LRUCache } from "lru-cache";
import type { CAIP373QuotedCommentResolverResult } from "../resolvers/caip373-quoted-comment-resolver.ts";
import config from "../../ponder.config.ts";
import { commentByIdResolverService } from "./comment-by-id-resolver.ts";

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
  });
