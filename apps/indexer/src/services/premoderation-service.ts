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

    const status = {
      status: this.defaultModerationStatus,
      changedAt: new Date(),
    };

    return {
      action: "premoderated",
      ...status,
      save: async () => {
        await this.cacheService.insertStatusByCommentId(comment.id, status);
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
        });
      },
    };
  }

  async updateStatus(
    commentId: Hex,
    status: ModerationStatus,
  ): Promise<CommentSelectType | undefined> {
    return this.dbService.updateCommentModerationStatus(commentId, status);
  }
}
