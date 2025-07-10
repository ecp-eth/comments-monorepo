import type {
  IPremoderationCacheService,
  PremoderationCacheServiceStatus,
} from "./types";
import type { Hex } from "@ecp.eth/sdk/core";
import { getIndexerDb } from "../management/db";

export class PremoderationCacheService implements IPremoderationCacheService {
  async getStatusByCommentId(
    commentId: Hex,
  ): Promise<PremoderationCacheServiceStatus | undefined> {
    const db = getIndexerDb();

    const result = await db
      .selectFrom("comment_moderation_statuses")
      .select(["moderation_status as status", "updated_at as changedAt"])
      .where("comment_id", "=", commentId)
      .executeTakeFirst();

    return result;
  }

  async setStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void> {
    const db = getIndexerDb();

    await db
      .updateTable("comment_moderation_statuses")
      .set({
        moderation_status: status.status,
        updated_at: status.changedAt,
      })
      .where("comment_id", "=", commentId)
      .execute();
  }
}
