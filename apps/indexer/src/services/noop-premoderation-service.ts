import type { CommentSelectType } from "ponder:schema";
import type {
  ModerationNotificationServicePendingComment,
  ICommentPremoderationService,
  CommentPremoderationServiceModerateResult,
} from "./types.ts";
import type { CommentModerationStatusesSelectType } from "../../schema.offchain.ts";

export class NoopPremoderationService implements ICommentPremoderationService {
  async moderate(): Promise<CommentPremoderationServiceModerateResult> {
    return {
      action: "skipped",
      status: "approved",
      changedAt: new Date(),
      save: async () => {},
    };
  }

  async moderateUpdate(
    _: ModerationNotificationServicePendingComment,
    existingComment: CommentSelectType,
  ): Promise<CommentPremoderationServiceModerateResult> {
    return {
      action: "skipped",
      status: existingComment.moderationStatus,
      changedAt: existingComment.moderationStatusChangedAt,
      save: async () => {},
    };
  }

  async updateStatus(): Promise<CommentSelectType | undefined> {
    return undefined;
  }

  async getPendingComment(): Promise<CommentSelectType | undefined> {
    return undefined;
  }

  async getStatusByCommentId(): Promise<
    CommentModerationStatusesSelectType | undefined
  > {
    return undefined;
  }

  async getLatestStatusByCommentId(): Promise<
    CommentModerationStatusesSelectType | undefined
  > {
    return undefined;
  }

  async getCommentById(): Promise<CommentSelectType | undefined> {
    return undefined;
  }
}
