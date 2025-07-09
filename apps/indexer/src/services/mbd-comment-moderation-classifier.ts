import DataLoader from "dataloader";
import { z } from "zod";
import {
  type CommentModerationClassfierResult,
  type ICommentClassifierCacheService,
  type ICommentModerationClassifierService,
  CommentModerationLabel,
  type CommentModerationLabelsWithScore,
  ModerationNotificationServicePendingComment,
} from "./types";
import { CommentSelectType } from "ponder:schema";

const responseSchema = z.object({
  status_code: z.literal(200),
  body: z.array(
    z.array(
      z.object({
        label: z.nativeEnum(CommentModerationLabel).or(z.string().nonempty()),
        score: z.number(),
      }),
    ),
  ),
});

type CommentModerationClassifierOptions = {
  apiKey: string;
  cacheService: ICommentClassifierCacheService;
};

/**
 * Classifies comments using the MBD.xyz API
 *
 * @see https://docs.mbd.xyz/reference/post_casts-labels-for-text
 */
export class CommentModerationClassifier
  extends DataLoader<
    string,
    Omit<CommentModerationClassfierResult, "save" | "action">
  >
  implements ICommentModerationClassifierService
{
  private cacheService: ICommentClassifierCacheService;

  constructor(options: CommentModerationClassifierOptions) {
    super(
      async (contents) => {
        const url = new URL(
          "/v2/farcaster/casts/labels/for-text",
          "https://api.mbd.xyz",
        );

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "ECP Indexer",
            "HTTP-Referer": "https://api.ethcomments.xyz",
          },
          body: JSON.stringify({
            text_inputs: Array.from(contents),
            label_category: "moderation",
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to classify comments: API returned a non-200 status code ${response.status} (${response.statusText})`,
          );
        }

        const { body } = responseSchema.parse(await response.json());

        if (body.length !== contents.length) {
          throw new Error(
            `Failed to classify comments: The api did not return the correct number of results.`,
          );
        }

        return contents.map((_, index) => {
          const labels = body[index];

          if (!labels) {
            return new Error(
              `Failed to classify comments: The api did not return the correct number of results.`,
            );
          }

          let score = 0;
          const labelsWithScore: CommentModerationLabelsWithScore = {};

          for (const label of labels) {
            labelsWithScore[label.label] = label.score;
            score = Math.max(score, label.score);
          }

          return {
            score,
            labels: labelsWithScore,
          };
        });
      },
      {
        cache: false,
      },
    );

    this.cacheService = options.cacheService;
  }

  /**
   * Classifies a single comment content
   * @param content The comment content to classify
   * @returns Array of labels with scores
   */
  async classify(
    comment: ModerationNotificationServicePendingComment,
  ): Promise<CommentModerationClassfierResult> {
    const cachedResult = await this.cacheService.getByCommentId(comment.id);

    if (cachedResult) {
      return {
        action: "skipped",
        labels: cachedResult.labels,
        score: cachedResult.score,
        save: async () => {},
      };
    }

    const result = await this.load(comment.content);

    return {
      action: "classified",
      labels: result.labels,
      score: result.score,
      save: async () => {
        await this.cacheService.setByCommentId(comment.id, {
          labels: result.labels,
          score: result.score,
        });
      },
    };
  }

  async classifyUpdate(
    comment: ModerationNotificationServicePendingComment,
    existingComment: CommentSelectType,
  ): Promise<CommentModerationClassfierResult> {
    if (comment.content === existingComment.content) {
      return {
        action: "skipped",
        labels: existingComment.moderationClassifierResult,
        score: existingComment.moderationClassifierScore,
        save: async () => {},
      };
    }

    const result = await this.load(comment.content);

    return {
      action: "classified",
      labels: result.labels,
      score: result.score,
      save: async () => {
        await this.cacheService.setByCommentId(comment.id, {
          labels: result.labels,
          score: result.score,
        });
      },
    };
  }
}
