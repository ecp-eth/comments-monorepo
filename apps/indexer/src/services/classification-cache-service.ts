import type { Hex } from "@ecp.eth/sdk/core";
import type {
  CommentClassifierCacheServiceResult,
  ICommentClassifierCacheService,
} from "./types.ts";
import type { DB } from "./db.ts";
import { and, eq } from "drizzle-orm";
import { schema } from "../../schema.ts";

export class ClassificationCacheService
  implements ICommentClassifierCacheService
{
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async getByCommentId(
    commentId: Hex,
    commentRevision: number,
  ): Promise<CommentClassifierCacheServiceResult | undefined> {
    const result = await this.db.query.commentClassificationResults
      .findFirst({
        columns: {
          labels: true,
          score: true,
        },
        where: and(
          eq(schema.commentClassificationResults.commentId, commentId),
          eq(
            schema.commentClassificationResults.commentRevision,
            commentRevision,
          ),
        ),
      })
      .execute();

    return result;
  }

  async setByCommentId(params: {
    commentId: Hex;
    commentRevision: number;
    result: CommentClassifierCacheServiceResult;
  }): Promise<void> {
    await this.db
      .insert(schema.commentClassificationResults)
      .values({
        commentId: params.commentId,
        commentRevision: params.commentRevision,
        labels: params.result.labels,
        score: params.result.score,
      })
      .onConflictDoUpdate({
        target: [
          schema.commentClassificationResults.commentId,
          schema.commentClassificationResults.commentRevision,
        ],
        set: {
          labels: params.result.labels,
          score: params.result.score,
        },
      })
      .execute();
  }

  async deleteByCommentId(
    commentId: Hex,
    commentRevision: number,
  ): Promise<void> {
    await this.db
      .delete(schema.commentClassificationResults)
      .where(
        and(
          eq(schema.commentClassificationResults.commentId, commentId),
          eq(
            schema.commentClassificationResults.commentRevision,
            commentRevision,
          ),
        ),
      )
      .execute();
  }
}
