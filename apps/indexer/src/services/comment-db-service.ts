import type {
  ICommentDbService,
  IPremoderationCacheService,
  ModerationStatus,
} from "./types";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Hex } from "@ecp.eth/sdk/core";
import { eq } from "ponder";
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

export class CommentAlreadyInStatusError extends BaseCommentModerationException {
  constructor(status: ModerationStatus) {
    super(400, `Comment is already in status ${status}`);
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

  async updateCommentModerationStatus(
    commentId: Hex,
    status: ModerationStatus,
  ): Promise<CommentSelectType | undefined> {
    const [updatedComment] = await db.transaction(async (tx) => {
      const commentModerationStatus =
        await this.cacheService.getStatusByCommentId(commentId);

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

      await this.cacheService.setStatusByCommentId(commentId, {
        status,
        changedAt: new Date(),
      });

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
}
