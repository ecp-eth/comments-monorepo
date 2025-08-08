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
    commentRevision: number,
  ): Promise<CommentClassifierCacheServiceResult | undefined> {
    const db = getIndexerDb();

    const result = await db
      .selectFrom("comment_classification_results")
      .select(["labels", "score"])
      .where("comment_id", "=", commentId)
      .where("revision", "=", commentRevision)
      .executeTakeFirst();

    return result;
  }

  async setByCommentId(params: {
    commentId: Hex;
    commentRevision: number;
    result: CommentClassifierCacheServiceResult;
  }): Promise<void> {
    const db = getIndexerDb();

    await db
      .insertInto("comment_classification_results")
      .values({
        comment_id: params.commentId,
        revision: params.commentRevision,
        labels: params.result.labels,
        score: params.result.score,
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
