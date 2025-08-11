import type {
  IPremoderationCacheService,
  PremoderationCacheServiceStatus,
} from "./types";
import type { Hex } from "@ecp.eth/sdk/core";
import { db as dbService } from "../services";
import { and, desc, eq, lt } from "drizzle-orm";
import { schema } from "../../schema";

export class PremoderationCacheService implements IPremoderationCacheService {
  constructor(private db: typeof dbService) {}

  async getStatusByCommentId(
    commentId: Hex,
    commentRevision: number,
  ): Promise<PremoderationCacheServiceStatus | undefined> {
    const result = await this.db.query.commentModerationStatuses
      .findFirst({
        columns: {
          revision: true,
          updatedAt: true,
          moderationStatus: true,
        },
        where: and(
          eq(schema.commentModerationStatuses.commentId, commentId),
          eq(schema.commentModerationStatuses.revision, commentRevision),
        ),
      })
      .execute();

    return result;
  }

  async getLatestStatusByCommentId(
    commentId: Hex,
  ): Promise<PremoderationCacheServiceStatus | undefined> {
    const result = await this.db.query.commentModerationStatuses
      .findFirst({
        columns: {
          revision: true,
          updatedAt: true,
          moderationStatus: true,
        },
        where: eq(schema.commentModerationStatuses.commentId, commentId),
        orderBy: desc(schema.commentModerationStatuses.revision),
      })
      .execute();

    return result;
  }

  async insertStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void> {
    await this.db
      .insert(schema.commentModerationStatuses)
      .values({
        commentId,
        revision: status.revision,
        moderationStatus: status.moderationStatus,
        updatedAt: status.updatedAt,
      })
      .execute();
  }

  async setStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(schema.commentModerationStatuses)
        .values({
          commentId,
          moderationStatus: status.moderationStatus,
          revision: status.revision,
          updatedAt: status.updatedAt,
        })
        .onConflictDoUpdate({
          target: [
            schema.commentModerationStatuses.commentId,
            schema.commentModerationStatuses.revision,
          ],
          set: {
            moderationStatus: status.moderationStatus,
            updatedAt: status.updatedAt,
          },
        })
        .execute();

      if (status.moderationStatus === "pending") {
        // if the new status is pending, keep the old revisions untouched
        // also ignore newer revisions
        return;
      }

      await tx
        .update(schema.commentModerationStatuses)
        .set({
          moderationStatus: status.moderationStatus,
          updatedAt: status.updatedAt,
        })
        .where(
          and(
            eq(schema.commentModerationStatuses.commentId, commentId),
            // new status is not pending, mark all older pending revisions to be of the same status
            // this solves an issue when someone edits a comment multiple times and it wasn't premoderated
            lt(schema.commentModerationStatuses.revision, status.revision),
            eq(schema.commentModerationStatuses.moderationStatus, "pending"),
          ),
        )
        .execute();
    });
  }
}
