import type { Hex } from "@ecp.eth/sdk/core";
import type {
  CommentClassifierCacheServiceResult,
  ICommentClassifierCacheService,
} from "./types";
import type { DB } from "./db";
import { and, eq } from "drizzle-orm";
import { schema } from "../../schema";

export class ClassificationCacheService
  implements ICommentClassifierCacheService
{
  constructor(private db: DB) {}

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
          eq(schema.commentClassificationResults.revision, commentRevision),
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
        revision: params.commentRevision,
        labels: params.result.labels,
        score: params.result.score,
      })
      .onConflictDoUpdate({
        target: [
          schema.commentClassificationResults.commentId,
          schema.commentClassificationResults.revision,
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
          eq(schema.commentClassificationResults.revision, commentRevision),
        ),
      )
      .execute();
  }
}
