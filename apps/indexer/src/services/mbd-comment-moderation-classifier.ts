import DataLoader from "dataloader";
import { z } from "zod";

const CommentModerationLabel = z.enum([
  "llm_generated",
  "spam",
  "sexual",
  "hate",
  "violence",
  "harassment",
  "self_harm",
  "sexual_minors",
  "hate_threatening",
  "violence_graphic",
]);

type CommentModerationLabelType = z.infer<typeof CommentModerationLabel>;

const responseSchema = z.object({
  status_code: z.literal(200),
  body: z.array(
    z.array(
      z.object({
        label: CommentModerationLabel.or(z.string().nonempty()),
        score: z.number(),
      }),
    ),
  ),
});

export type CommentModerationLabelWithScore = {
  label: CommentModerationLabelType | string;
  score: number;
};

export type CommentModerationClassfierResult = {
  /**
   * The highest score of the moderation labels.
   */
  score: number;
  labels: CommentModerationLabelWithScore[];
};

type CommentModerationClassifierOptions = {
  apiKey: string;
};

/**
 * Classifies comments using the MBD.xyz API
 *
 * @see https://docs.mbd.xyz/reference/post_casts-labels-for-text
 */
export class CommentModerationClassifier extends DataLoader<
  string,
  CommentModerationClassfierResult
> {
  constructor(options: CommentModerationClassifierOptions) {
    super(
      async (contents) => {
        const url = new URL("/v2/casts/labels/for-text", "https://api.mbd.xyz");

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

          return {
            score: labels.reduce((max, label) => Math.max(max, label.score), 0),
            labels,
          };
        });
      },
      {
        cache: false,
      },
    );
  }

  /**
   * Classifies a single comment content
   * @param content The comment content to classify
   * @returns Array of labels with scores
   */
  async classify(content: string): Promise<CommentModerationClassfierResult> {
    return this.load(content);
  }
}
