import { renderToMarkdown } from "@ecp.eth/shared/renderer";
import { describe, expect, it } from "vitest";
import { escapeTelegramMarkdownTextElement } from "../../src/utils/escapeTelegramMarkdownTextElement";

describe("escapeTelegramMarkdownTextElement", () => {
  it("correctly escapes the text content", () => {
    const result = renderToMarkdown({
      content: `There is no Take
{\\__/}
( • . •)
/ > I Love you all ♥️`,
      references: [],
      elementRenderers: {
        text: escapeTelegramMarkdownTextElement,
      },
    });

    expect(result.result).toBe(
      "There is no Take\n\n{\\\\_\\_/}\n\n( • . •)\n\n/ > I Love you all ♥️\n\n",
    );
  });
});
