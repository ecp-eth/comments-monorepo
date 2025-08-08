import type {
  IPremoderationCacheService,
  PremoderationCacheServiceStatus,
} from "./types";
import type { Hex } from "@ecp.eth/sdk/core";
import { getIndexerDb } from "../management/db";

export class PremoderationCacheService implements IPremoderationCacheService {
  async getStatusByCommentId(
    commentId: Hex,
    commentRevision: number,
  ): Promise<PremoderationCacheServiceStatus | undefined> {
    const db = getIndexerDb();

    const result = await db
      .selectFrom("comment_moderation_statuses")
      .select([
        "moderation_status as status",
        "updated_at as changedAt",
        "revision",
      ])
      .where("comment_id", "=", commentId)
      .where("revision", "=", commentRevision)
      .executeTakeFirst();

    return result;
  }

  async getLatestStatusByCommentId(
    commentId: Hex,
  ): Promise<PremoderationCacheServiceStatus | undefined> {
    const db = getIndexerDb();

    const result = await db
      .selectFrom("comment_moderation_statuses")
      .select([
        "moderation_status as status",
        "updated_at as changedAt",
        "revision",
      ])
      .where("comment_id", "=", commentId)
      .orderBy("revision", "desc")
      .limit(1)
      .executeTakeFirst();

    return result;
  }

  async insertStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void> {
    const db = getIndexerDb();

    await db
      .insertInto("comment_moderation_statuses")
      .values({
        comment_id: commentId,
        revision: status.revision,
        moderation_status: status.status,
        updated_at: status.changedAt,
      })
      .execute();
  }

  async setStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void> {
    const db = getIndexerDb();

    await db.transaction().execute(async (tx) => {
      await tx
        .insertInto("comment_moderation_statuses")
        .values({
          comment_id: commentId,
          moderation_status: status.status,
          revision: status.revision,
          updated_at: status.changedAt,
        })
        .onConflict((cb) =>
          cb.columns(["comment_id", "revision"]).doUpdateSet({
            moderation_status: status.status,
            updated_at: status.changedAt,
          }),
        )
        .execute();

      if (status.status === "pending") {
        // if the new status is pending, keep the old revisions untouched
        // also ignore newer revisions
        return;
      }

      await tx
        .updateTable("comment_moderation_statuses")
        .set({
          moderation_status: status.status,
          updated_at: status.changedAt,
        })
        .where("comment_id", "=", commentId)
        // new status is not pending, mark all older pending revisions to be of the same status
        // this solves an issue when someone edits a comment multiple times and it wasn't premoderated
        .where("revision", "<", status.revision)
        .where("moderation_status", "=", "pending")
        .execute();
    });
  }
}
