import { createCommentByIdResolver } from "./resolvers/comment-by-id-resolver";
import { db } from "./db";
import { metrics } from "./metrics";

export const commentByIdResolverService = createCommentByIdResolver({
  db,
  cache: false,
  metrics,
});
