import type { Hex } from "@ecp.eth/sdk/core";
import type {
  CommentClassifierCacheServiceResult,
  ICommentClassifierCacheService,
} from "./types";
import { getIndexerDb } from "../management/db";

export class ClassificationCacheService
  implements ICommentClassifierCacheService
{
  async getByCommentId(
    commentId: Hex,
  ): Promise<CommentClassifierCacheServiceResult | undefined> {
    const db = getIndexerDb();

    const result = await db
      .selectFrom("comment_classification_results")
      .select(["labels", "score"])
      .where("comment_id", "=", commentId)
      .executeTakeFirst();

    return result;
  }

  async setByCommentId(
    commentId: Hex,
    result: CommentClassifierCacheServiceResult,
  ): Promise<void> {
    const db = getIndexerDb();

    await db
      .insertInto("comment_classification_results")
      .values({
        comment_id: commentId,
        labels: result.labels,
        score: result.score,
      })
      .execute();
  }

  async deleteByCommentId(commentId: Hex): Promise<void> {
    const db = getIndexerDb();

    await db
      .deleteFrom("comment_classification_results")
      .where("comment_id", "=", commentId)
      .execute();
  }
}
