import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import nock from "nock";
import { CommentModerationClassifier } from "../../src/services/mbd-comment-moderation-classifier";

describe("CommentModerationClassifier", () => {
  const API_KEY = "test-api-key";
  const classifier: CommentModerationClassifier =
    new CommentModerationClassifier({ apiKey: API_KEY });

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("should classify a single comment successfully", async () => {
    const mockResponse = {
      status_code: 200,
      body: [
        [
          { label: "spam", score: 0.1 },
          { label: "hate", score: 0.2 },
          { label: "llm_generated", score: 0.8 },
        ],
      ],
    };

    nock("https://api.mbd.xyz/v2")
      .post("/casts/labels/for-text", {
        text_inputs: ["Test comment"],
        label_category: "moderation",
      })
      .matchHeader("Authorization", `Bearer ${API_KEY}`)
      .matchHeader("Content-Type", "application/json")
      .matchHeader("Accept", "application/json")
      .matchHeader("X-Title", "ECP Indexer")
      .matchHeader("HTTP-Referer", "https://api.ethcomments.xyz")
      .reply(200, mockResponse);

    const result = await classifier.classify("Test comment");

    expect(result).toEqual({
      score: 0.8,
      labels: [
        { label: "spam", score: 0.1 },
        { label: "hate", score: 0.2 },
        { label: "llm_generated", score: 0.8 },
      ],
    });
  });

  it("should handle API errors gracefully", async () => {
    nock("https://api.mbd.xyz/v2")
      .post("/casts/labels/for-text")
      .reply(400, { status_code: 400, body: "Error" });

    await expect(classifier.classify("Test comment")).rejects.toThrow(
      "Failed to classify comments: API returned a non-200 status code 400 (Bad Request)",
    );
  });

  it("should handle invalid API responses", async () => {
    const invalidResponse = {
      status_code: 200,
      body: [], // Empty body, which is invalid
    };

    nock("https://api.mbd.xyz/v2")
      .post("/casts/labels/for-text")
      .reply(200, invalidResponse);

    await expect(classifier.classify("Test comment")).rejects.toThrow(
      "Failed to classify comments: The api did not return the correct number of results",
    );
  });

  it("should handle batch classification", async () => {
    const mockResponse = {
      status_code: 200,
      body: [
        [
          { label: "spam", score: 0.1 },
          { label: "hate", score: 0.2 },
        ],
        [
          { label: "llm_generated", score: 0.9 },
          { label: "spam", score: 0.3 },
        ],
      ],
    };

    nock("https://api.mbd.xyz/v2")
      .post("/casts/labels/for-text", {
        text_inputs: ["Comment 1", "Comment 2"],
        label_category: "moderation",
      })
      .reply(200, mockResponse);

    const results = await Promise.all([
      classifier.classify("Comment 1"),
      classifier.classify("Comment 2"),
    ]);

    expect(results).toEqual([
      {
        score: 0.2,
        labels: [
          { label: "spam", score: 0.1 },
          { label: "hate", score: 0.2 },
        ],
      },
      {
        score: 0.9,
        labels: [
          { label: "llm_generated", score: 0.9 },
          { label: "spam", score: 0.3 },
        ],
      },
    ]);
  });
});
