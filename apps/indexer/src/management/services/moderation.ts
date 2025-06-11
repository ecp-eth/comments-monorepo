import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { eq } from "ponder";
import { getIndexerDb } from "../db";
import { db } from "../../db";
import schema from "ponder:schema";
import { HTTPException } from "hono/http-exception";

export class CommentNotFoundError extends HTTPException {
  constructor(commentId: Hex) {
    super(404, {
      message: `Comment not found for id ${commentId}`,
      res: new Response(
        JSON.stringify({
          message: `Comment not found for id ${commentId}`,
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    });
  }
}

export class CommentModerationStatusNotFoundError extends HTTPException {
  constructor(commentId: Hex) {
    super(404, {
      message: `Comment moderation status not found for comment ${commentId}`,
      res: new Response(
        JSON.stringify({
          message: `Comment moderation status not found for comment ${commentId}`,
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    });
  }
}

export class CommentAlreadyInStatusError extends HTTPException {
  constructor(status: ModerationStatus) {
    super(400, {
      message: `Comment is already in status ${status}`,
      res: new Response(
        JSON.stringify({
          message: `Comment is already in status ${status}`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    });
  }
}

type ModerationStatus = "pending" | "approved" | "rejected";

export async function insertCommentModerationStatus(
  commentId: string,
  status: ModerationStatus = "pending",
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
  commentId: Hex,
  status: ModerationStatus,
) {
  const indexerDb = getIndexerDb();

  const [updatedComment] = await db.transaction(async (tx) => {
    const commentModerationStatus = await getCommentModerationStatus(commentId);

    if (!commentModerationStatus) {
      throw new CommentModerationStatusNotFoundError(commentId);
    }

    if (commentModerationStatus.status === status) {
      throw new CommentAlreadyInStatusError(status);
    }

    const comment = await tx.query.comment.findFirst({
      where: eq(schema.comment.id, commentId),
    });

    if (!comment) {
      throw new CommentNotFoundError(commentId);
    }

    await indexerDb
      .updateTable("comment_moderation_statuses")
      .set({
        moderation_status: status,
        updated_at: new Date(),
      })
      .where("comment_id", "=", comment.id)
      .execute();

    return await tx
      .update(schema.comment)
      .set({
        moderationStatus: status,
        moderationStatusChangedAt: new Date(),
      })
      .where(eq(schema.comment.id, comment.id))
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
