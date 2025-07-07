import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { eq } from "ponder";
import { Event } from "ponder:registry";
import { getIndexerDb } from "../db";
import { db } from "../../db";
import schema, { type CommentSelectType } from "ponder:schema";
import { HTTPException } from "hono/http-exception";
import type {
  CommentModerationClassifierService,
  ModerationNotificationsService,
} from "../../services/types";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { CommentModerationClassfierResult } from "../../services/types";

abstract class BaseCommentModerationException extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string) {
    super(status, {
      message,
      res: new Response(JSON.stringify({ message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    });
  }
}
export class CommentNotFoundError extends BaseCommentModerationException {
  constructor(commentId: Hex) {
    super(404, `Comment not found for id ${commentId}`);
  }
}

export class CommentModerationStatusNotFoundError extends BaseCommentModerationException {
  constructor(commentId: Hex) {
    super(404, `Comment moderation status not found for comment ${commentId}`);
  }
}

export class CommentAlreadyInStatusError extends BaseCommentModerationException {
  constructor(status: ModerationStatus) {
    super(400, `Comment is already in status ${status}`);
  }
}

type ModerationStatus = "pending" | "approved" | "rejected";

interface CommentModerationServiceOptions {
  enabled: boolean;
  knownReactions: Set<string>;
  notificationService: ModerationNotificationsService;
  classifierService: CommentModerationClassifierService;
}

interface ModerationStatusResult {
  result: {
    status: ModerationStatus;
    changedAt: Date;
    classifier: CommentModerationClassfierResult;
  };
  saveAndNotify(): Promise<void>;
}

export class CommentModerationService {
  private enabled: boolean;
  private knownReactions: Set<string>;
  private notificationService: ModerationNotificationsService;
  private defaultModerationStatus: ModerationStatus;
  private classifierService: CommentModerationClassifierService;

  constructor(options: CommentModerationServiceOptions) {
    this.enabled = options.enabled;
    this.knownReactions = options.knownReactions;
    this.notificationService = options.notificationService;
    this.defaultModerationStatus = options.enabled ? "pending" : "approved";
    this.classifierService = options.classifierService;
  }

  async moderate(
    comment: Event<"CommentsV1:CommentAdded">["args"],
    references: IndexerAPICommentReferencesSchemaType,
  ): Promise<ModerationStatusResult> {
    if (!this.enabled) {
      return {
        result: {
          status: this.defaultModerationStatus,
          changedAt: new Date(),
          classifier: {
            score: 0,
            labels: [],
          },
        },
        saveAndNotify: async () => {},
      };
    }

    // commentType 1 represents reactions
    if (
      comment.commentType === COMMENT_TYPE_REACTION &&
      this.knownReactions.has(comment.content)
    ) {
      return {
        result: {
          status: "approved",
          changedAt: new Date(),
          classifier: {
            score: 0,
            labels: [],
          },
        },
        saveAndNotify: async () => {},
      };
    }

    const classifierResult = await this.classifierService.classify(
      comment.content,
    );

    const result = await this.getCommentModerationStatus(comment.commentId);

    const moderationStatus = {
      status: result?.status ?? this.defaultModerationStatus,
      changedAt: result?.changedAt ?? new Date(),
      classifier: classifierResult,
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

          if (moderationStatus.status === "pending") {
            await this.notifyTelegram({
              comment,
              references,
              classifierResult,
            });
          }
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

  async getComment(commentId: Hex): Promise<CommentSelectType | undefined> {
    const comment = await db.query.comment.findFirst({
      where: eq(schema.comment.id, commentId),
    });

    return comment;
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

  private async notifyTelegram({
    comment,
    references,
    classifierResult,
  }: {
    comment: Event<"CommentsV1:CommentAdded">["args"];
    references: IndexerAPICommentReferencesSchemaType;
    classifierResult: CommentModerationClassfierResult;
  }) {
    return this.notificationService.notifyPendingModeration(
      {
        channelId: comment.channelId,
        author: comment.author,
        content: comment.content,
        targetUri: comment.targetUri,
        references,
        id: comment.commentId,
        parentId: comment.parentId,
      },
      classifierResult,
    );
  }
}
