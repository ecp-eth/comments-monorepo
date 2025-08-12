import type { CommentSelectType } from "ponder:schema";
import type {
  ModerationNotificationServicePendingComment,
  ICommentPremoderationService,
  CommentPremoderationServiceModerateResult,
  ModerationStatus,
} from "./types";
import type { Hex } from "@ecp.eth/sdk/core";
import type { DB } from "./db";
import { and, desc, eq, lt } from "drizzle-orm";
import { schema } from "../../schema";
import type { CommentModerationStatusesSelectType } from "../../schema.offchain";
import {
  CommentModerationStatusNotFoundError,
  CommentNotFoundError,
} from "./errors";

type PremoderationServiceOptions = {
  defaultModerationStatus: ModerationStatus;
  db: DB;
};

export class PremoderationService implements ICommentPremoderationService {
  private defaultModerationStatus: ModerationStatus;
  private db: DB;

  constructor(options: PremoderationServiceOptions) {
    this.defaultModerationStatus = options.defaultModerationStatus;
    this.db = options.db;
  }

  async moderate(
    comment: ModerationNotificationServicePendingComment,
  ): Promise<CommentPremoderationServiceModerateResult> {
    const cachedStatus = await this.getStatusByCommentId(
      comment.id,
      comment.revision,
    );

    if (cachedStatus) {
      // this is skipped status because it is already stored in the cache
      return {
        action: "skipped",
        status: cachedStatus.moderationStatus,
        changedAt: cachedStatus.updatedAt,
        save: async () => {},
      };
    }

    const changedAt = new Date();
    const status = this.defaultModerationStatus;

    return {
      action: "premoderated",
      changedAt,
      status,
      save: async () => {
        await this.db
          .insert(schema.commentModerationStatuses)
          .values({
            commentId: comment.id,
            moderationStatus: status,
            updatedAt: changedAt,
            revision: comment.revision,
          })
          .execute();
      },
    };
  }

  async moderateUpdate(
    comment: ModerationNotificationServicePendingComment,
    existingComment: CommentSelectType,
  ): Promise<CommentPremoderationServiceModerateResult> {
    if (comment.content === existingComment.content) {
      return {
        action: "skipped",
        status: existingComment.moderationStatus,
        changedAt: existingComment.moderationStatusChangedAt,
        save: async () => {},
      };
    }

    const status = "pending" as const;
    const changedAt = new Date();

    return {
      action: "premoderated",
      status,
      changedAt,
      save: async () => {
        await this.db
          .insert(schema.commentModerationStatuses)
          .values({
            commentId: comment.id,
            moderationStatus: status,
            updatedAt: changedAt,
            revision: comment.revision,
          })
          .execute();
      },
    };
  }

  async updateStatus({
    commentId,
    commentRevision,
    status,
  }: {
    commentId: Hex;
    /**
     * If omitted it will update the latest revision and all older pending revisions.
     */
    commentRevision: number | undefined;
    status: ModerationStatus;
  }): Promise<CommentSelectType | undefined> {
    return await this.db.transaction(async (tx) => {
      const commentModerationStatus =
        commentRevision != null
          ? await this.getStatusByCommentId(commentId, commentRevision)
          : await this.getLatestStatusByCommentId(commentId);

      if (!commentModerationStatus) {
        throw new CommentModerationStatusNotFoundError(
          commentId,
          commentRevision ?? 0,
        );
      }

      const comment = await tx.query.comment.findFirst({
        where: eq(schema.comment.id, commentId),
      });

      if (!comment) {
        throw new CommentNotFoundError(commentId);
      }

      // if the comment is already in the status, simply return the comment
      if (commentModerationStatus.moderationStatus === status) {
        return comment;
      }

      const changedAt = new Date();

      await this.db
        .insert(schema.commentModerationStatuses)
        .values({
          commentId,
          moderationStatus: status,
          updatedAt: changedAt,
          revision: commentModerationStatus.revision,
        })
        .onConflictDoUpdate({
          target: [
            schema.commentModerationStatuses.commentId,
            schema.commentModerationStatuses.revision,
          ],
          set: {
            moderationStatus: status,
            updatedAt: changedAt,
          },
        })
        .execute();

      const [updatedComment] = await this.db
        .update(schema.comment)
        .set({
          moderationStatus: status,
          moderationStatusChangedAt: changedAt,
        })
        .where(eq(schema.comment.id, commentId))
        .returning()
        .execute();

      if (status === "pending") {
        // keep the old revisions untouched
        return updatedComment;
      }

      // set old pending revisions to same status
      await this.db
        .update(schema.commentModerationStatuses)
        .set({
          moderationStatus: status,
        })
        .where(
          // new status is not pending, mark all older pending revisions to be of the same status
          // this solves an issue when someone edits a comment multiple times and it wasn't premoderated
          and(
            eq(schema.commentModerationStatuses.commentId, commentId),
            eq(schema.commentModerationStatuses.moderationStatus, "pending"),
            lt(
              schema.commentModerationStatuses.revision,
              commentModerationStatus.revision,
            ),
          ),
        )
        .execute();

      return updatedComment;
    });
  }

  async getPendingComment(): Promise<CommentSelectType | undefined> {
    return this.db.query.comment.findFirst({
      where: eq(schema.comment.moderationStatus, "pending"),
      orderBy: desc(schema.comment.moderationStatusChangedAt),
    });
  }

  async getStatusByCommentId(
    commentId: Hex,
    commentRevision: number,
  ): Promise<CommentModerationStatusesSelectType | undefined> {
    return this.db.query.commentModerationStatuses.findFirst({
      where: and(
        eq(schema.commentModerationStatuses.commentId, commentId),
        eq(schema.commentModerationStatuses.revision, commentRevision),
      ),
    });
  }

  async getLatestStatusByCommentId(
    commentId: Hex,
  ): Promise<CommentModerationStatusesSelectType | undefined> {
    return this.db.query.commentModerationStatuses.findFirst({
      where: eq(schema.commentModerationStatuses.commentId, commentId),
      orderBy: desc(schema.commentModerationStatuses.revision),
    });
  }

  async getCommentById(commentId: Hex): Promise<CommentSelectType | undefined> {
    return this.db.query.comment.findFirst({
      where: eq(schema.comment.id, commentId),
    });
  }
}
