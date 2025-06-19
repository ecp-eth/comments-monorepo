import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { eq } from "ponder";
import { Event } from "ponder:registry";
import { getIndexerDb } from "../db";
import { db } from "../../db";
import schema, { CommentSelectType } from "ponder:schema";
import { HTTPException } from "hono/http-exception";
import { notifyCommentPendingModeration } from "../../lib/telegram-notifications";

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

interface CommentModerationServiceOptions {
  enabled: boolean;
  knownReactions: Set<string>;
}

interface ModerationStatusResult {
  result: {
    status: ModerationStatus;
    changedAt: Date;
  };
  saveAndNotify(): Promise<void>;
}

export class CommentModerationService {
  private enabled: boolean;
  private knownReactions: Set<string>;
  private defaultModerationStatus: ModerationStatus;

  constructor(options: CommentModerationServiceOptions) {
    this.enabled = options.enabled;
    this.knownReactions = options.knownReactions;
    this.defaultModerationStatus = options.enabled ? "pending" : "approved";
  }

  async moderate(
    comment: Event<"CommentsV1:CommentAdded">["args"],
  ): Promise<ModerationStatusResult> {
    if (!this.enabled) {
      return {
        result: {
          status: this.defaultModerationStatus,
          changedAt: new Date(),
        },
        saveAndNotify: async () => {},
      };
    }

    // commentType 1 represents reactions
    if (comment.commentType === 1 && this.knownReactions.has(comment.content)) {
      return {
        result: {
          status: "approved",
          changedAt: new Date(),
        },
        saveAndNotify: async () => {},
      };
    }

    const result = await this.getCommentModerationStatus(comment.commentId);

    const moderationStatus = {
      status: result?.status ?? this.defaultModerationStatus,
      changedAt: result?.changedAt ?? new Date(),
    };

    return {
      result: moderationStatus,
      saveAndNotify: async () => {
        if (!this.enabled) {
          return;
        }

        if (!result) {
          await this.insertCommentModerationStatus(
            comment.commentId,
            moderationStatus.status,
          );
          await this.notifyTelegram(comment);
        }
      },
    };
  }

  async updateModerationStatus(
    commentId: Hex,
    status: ModerationStatus,
  ): Promise<CommentSelectType | undefined> {
    const indexerDb = getIndexerDb();

    const [updatedComment] = await db.transaction(async (tx) => {
      const commentModerationStatus =
        await this.getCommentModerationStatus(commentId);

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

  private async insertCommentModerationStatus(
    commentId: Hex,
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

  private async getCommentModerationStatus(commentId: Hex): Promise<
    | {
        status: ModerationStatus;
        changedAt: Date;
      }
    | undefined
  > {
    const db = getIndexerDb();

    const result = await db
      .selectFrom("comment_moderation_statuses")
      .select(["moderation_status as status", "updated_at as changedAt"])
      .where("comment_id", "=", commentId)
      .executeTakeFirst();

    return result;
  }

  private async notifyTelegram(
    comment: Event<"CommentsV1:CommentAdded">["args"],
  ) {
    return notifyCommentPendingModeration({
      authorAddress: comment.author,
      content: comment.content,
      targetUri: comment.targetUri,
      id: comment.commentId,
    });
  }
}
