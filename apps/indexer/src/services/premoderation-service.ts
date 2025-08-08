import type { CommentSelectType } from "ponder:schema";
import type {
  ModerationNotificationServicePendingComment,
  ICommentPremoderationService,
  CommentPremoderationServiceModerateResult,
  ModerationStatus,
  IPremoderationCacheService,
  ICommentDbService,
} from "./types";
import type { Hex } from "@ecp.eth/sdk/core";

type PremoderationServiceOptions = {
  defaultModerationStatus: ModerationStatus;
  cacheService: IPremoderationCacheService;
  dbService: ICommentDbService;
};

export class PremoderationService implements ICommentPremoderationService {
  private defaultModerationStatus: ModerationStatus;
  private cacheService: IPremoderationCacheService;
  private dbService: ICommentDbService;

  constructor(options: PremoderationServiceOptions) {
    this.defaultModerationStatus = options.defaultModerationStatus;
    this.cacheService = options.cacheService;
    this.dbService = options.dbService;
  }

  async moderate(
    comment: ModerationNotificationServicePendingComment,
  ): Promise<CommentPremoderationServiceModerateResult> {
    const cachedStatus = await this.cacheService.getStatusByCommentId(
      comment.id,
      comment.revision,
    );

    if (cachedStatus) {
      // this is skipped status because it is already stored in the cache
      return {
        action: "skipped",
        status: cachedStatus.status,
        changedAt: cachedStatus.changedAt,
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
        await this.cacheService.insertStatusByCommentId(comment.id, {
          changedAt,
          revision: comment.revision,
          status,
        });
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
        await this.cacheService.setStatusByCommentId(comment.id, {
          status,
          changedAt,
          revision: comment.revision,
        });
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
    return this.dbService.updateCommentModerationStatus({
      commentId,
      commentRevision,
      status,
    });
  }
}
