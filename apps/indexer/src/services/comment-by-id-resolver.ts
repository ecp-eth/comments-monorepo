import { createCommentByIdResolver } from "../resolvers/comment-by-id-resolver.ts";
import { db } from "./db.ts";

export const commentByIdResolverService = createCommentByIdResolver({
  db,
  cache: false,
});
