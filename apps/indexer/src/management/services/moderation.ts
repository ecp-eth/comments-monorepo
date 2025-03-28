import type { Hex } from "@ecp.eth/sdk/schemas";
import { eq } from "ponder";
import { getIndexerDb } from "../db";
import { db } from "../../db";
import schema from "ponder:schema";

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
  const indexerDb = getIndexerDb();

  const [updatedComment] = await db.transaction(async (tx) => {
    await indexerDb
      .updateTable("comment_moderation_statuses")
      .set({
        moderation_status: status,
        updated_at: new Date(),
      })
      .where("comment_id", "=", commentId)
      .execute();

    return await tx
      .update(schema.comment)
      .set({
        moderationStatus: "approved",
        moderationStatusChangedAt: new Date(),
      })
      .where(eq(schema.comment.id, commentId))
      .returning();
  });

  return updatedComment;
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
