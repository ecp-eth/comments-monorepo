import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * Detects if the content has some profane words.
 */
export function isProfane(content: string): boolean {
  return matcher.hasMatch(content);
}
