import {
  type ICommentModerationClassifierService,
  type CommentModerationClassfierResult,
  CommentModerationLabel,
  type CommentModerationLabelsWithScore,
  type ModerationNotificationServicePendingComment,
} from "./types";
import type { CommentSelectType } from "ponder:schema";

/**
 * A no-op implementation of CommentModerationClassifierService that always returns
 * a safe classification result with zero scores.
 */
export class NoopCommentModerationClassifier
  implements ICommentModerationClassifierService
{
  async classify(): Promise<CommentModerationClassfierResult> {
    return {
      action: "skipped",
      score: 0,
      labels: Object.values(CommentModerationLabel).reduce((acc, label) => {
        acc[label] = 0;

        return acc;
      }, {} as CommentModerationLabelsWithScore),
      save: async () => {},
    };
  }

  async classifyUpdate(
    _: ModerationNotificationServicePendingComment,
    existingComment: CommentSelectType,
  ): Promise<CommentModerationClassfierResult> {
    return {
      action: "skipped",
      score: existingComment.moderationClassifierScore,
      labels: existingComment.moderationClassifierResult,
      save: async () => {},
    };
  }
}
