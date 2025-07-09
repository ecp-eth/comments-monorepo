import {
  CommentModerationClassifierService,
  CommentModerationClassfierResult,
  CommentModerationLabel,
} from "./types";

/**
 * A no-op implementation of CommentModerationClassifierService that always returns
 * a safe classification result with zero scores.
 */
export class NoopCommentModerationClassifier
  implements CommentModerationClassifierService
{
  async classify(): Promise<CommentModerationClassfierResult> {
    // Return a result with all moderation labels set to score 0
    return {
      score: 0,
      labels: Object.values(CommentModerationLabel).map((label) => ({
        label,
        score: 0,
      })),
    };
  }
}
