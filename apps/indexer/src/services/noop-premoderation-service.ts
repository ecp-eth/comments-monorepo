import type { CommentSelectType } from "ponder:schema";
import type {
  ModerationNotificationServicePendingComment,
  ICommentPremoderationService,
  CommentPremoderationServiceModerateResult,
} from "./types";

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
}
