import type { Hex } from "@ecp.eth/sdk/schemas";
import { getIndexerDb } from "../db";

type ModerationStatus = "pending" | "approved" | "rejected";

export async function insertCommentModerationStatus(
  commentId: string,
  status: ModerationStatus = "pending"
) {
  const db = getIndexerDb();

  await db
    .insertInto("comment_moderation_statuses")
    .values({
      comment_id: commentId,
      moderation_status: status,
    })
    .execute();
}

export async function updateCommentModerationStatus(
  commentId: string,
  status: ModerationStatus
) {
  const db = getIndexerDb();

  await db
    .updateTable("comment_moderation_statuses")
    .set({
      moderation_status: status,
      updated_at: new Date(),
    })
    .where("comment_id", "=", commentId)
    .execute();
}

export async function getCommentModerationStatus(commentId: Hex) {
  const db = getIndexerDb();

  const result = await db
    .selectFrom("comment_moderation_statuses")
    .select(["moderation_status as status", "updated_at as changedAt"])
    .where("comment_id", "=", commentId)
    .executeTakeFirst();

  return result;
}
