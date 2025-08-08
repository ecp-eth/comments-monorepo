import type {
  ICommentDbService,
  IPremoderationCacheService,
  ModerationStatus,
} from "./types";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Hex } from "@ecp.eth/sdk/core";
import { eq, desc } from "ponder";
import schema, { type CommentSelectType } from "ponder:schema";
import { db } from "../db";

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

type CommentDbServiceOptions = {
  cacheService: IPremoderationCacheService;
};

export class CommentDbService implements ICommentDbService {
  private cacheService: IPremoderationCacheService;

  constructor(options: CommentDbServiceOptions) {
    this.cacheService = options.cacheService;
  }

  async getCommentById(commentId: Hex): Promise<CommentSelectType | undefined> {
    const comment = await db.query.comment.findFirst({
      where: eq(schema.comment.id, commentId),
    });

    return comment;
  }

  async getCommentPendingModeration(): Promise<CommentSelectType | undefined> {
    const comment = await db.query.comment.findFirst({
      where: eq(schema.comment.moderationStatus, "pending"),
      orderBy: desc(schema.comment.moderationStatusChangedAt),
    });

    return comment;
  }

  async updateCommentModerationStatus({
    commentId,
    commentRevision,
    status,
  }: {
    commentId: Hex;
    commentRevision: number | undefined;
    status: ModerationStatus;
  }): Promise<CommentSelectType | undefined> {
    const [updatedComment] = await db.transaction(async (tx) => {
      const commentModerationStatus =
        commentRevision != null
          ? await this.cacheService.getStatusByCommentId(
              commentId,
              commentRevision,
            )
          : await this.cacheService.getLatestStatusByCommentId(commentId);

      if (!commentModerationStatus) {
        throw new CommentModerationStatusNotFoundError(commentId);
      }

      const comment = await tx.query.comment.findFirst({
        where: eq(schema.comment.id, commentId),
      });

      if (!comment) {
        throw new CommentNotFoundError(commentId);
      }

      // if the comment is already in the status, simply return the comment
      if (commentModerationStatus.status === status) {
        return [comment];
      }

      const changedAt = new Date();

      await this.cacheService.setStatusByCommentId(commentId, {
        status,
        changedAt,
        revision: commentModerationStatus.revision,
      });

      return await tx
        .update(schema.comment)
        .set({
          moderationStatus: status,
          moderationStatusChangedAt: changedAt,
        })
        .where(eq(schema.comment.id, comment.id))
        .returning();
    });

    return updatedComment;
  }
}
