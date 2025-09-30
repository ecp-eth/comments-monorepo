import type { DB } from "./db.ts";
import { and, eq, desc } from "drizzle-orm";
import { schema } from "../../schema.ts";
import {
  type CommentReferencesCacheServiceGetReferenceResolutionResult,
  type CommentReferencesCacheServiceGetReferenceResolutionResultParams,
  type CommentReferencesCacheServiceUpdateReferenceResolutionResultParams,
  type ICommentReferencesCacheService,
} from "./types.ts";

export class CommentReferencesCacheService
  implements ICommentReferencesCacheService
{
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get the latest reference resolution result for a comment
   */
  async getReferenceResolutionResult({
    commentId,
    commentRevision,
  }: CommentReferencesCacheServiceGetReferenceResolutionResultParams): Promise<CommentReferencesCacheServiceGetReferenceResolutionResult> {
    const result = await this.db
      .select({
        references: schema.commentReferenceResolutionResults.references,
        referencesResolutionStatus:
          schema.commentReferenceResolutionResults.referencesResolutionStatus,
        updatedAt: schema.commentReferenceResolutionResults.updatedAt,
      })
      .from(schema.commentReferenceResolutionResults)
      .where(
        and(
          eq(schema.commentReferenceResolutionResults.commentId, commentId),
          eq(
            schema.commentReferenceResolutionResults.commentRevision,
            commentRevision,
          ),
        ),
      )
      .orderBy(desc(schema.commentReferenceResolutionResults.commentRevision))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Add or update a reference resolution result for a comment
   * Uses a transaction to ensure atomicity
   */
  async updateReferenceResolutionResult({
    commentId,
    commentRevision,
    references,
    referencesResolutionStatus,
  }: CommentReferencesCacheServiceUpdateReferenceResolutionResultParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Insert the new reference resolution result
      await tx
        .insert(schema.commentReferenceResolutionResults)
        .values({
          commentId,
          commentRevision: commentRevision,
          references,
          referencesResolutionStatus,
        })
        .onConflictDoUpdate({
          target: [
            schema.commentReferenceResolutionResults.commentId,
            schema.commentReferenceResolutionResults.commentRevision,
          ],
          set: {
            references,
            referencesResolutionStatus,
            updatedAt: new Date(),
          },
        })
        .execute();
    });
  }
}
