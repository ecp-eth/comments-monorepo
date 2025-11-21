import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import nock from "nock";
import { CommentModerationClassifier } from "../../../src/services/mbd-comment-moderation-classifier";
import { type ICommentClassifierCacheService } from "../../../src/services/types";
import { metrics } from "../../../src/services/metrics";

const mockClassifierCacheService = {
  getByCommentId: vi.fn(),
  setByCommentId: vi.fn(),
  deleteByCommentId: vi.fn(),
} as ICommentClassifierCacheService;

describe("CommentModerationClassifier", () => {
  const API_KEY = "test-api-key";
  const classifier: CommentModerationClassifier =
    new CommentModerationClassifier({
      apiKey: API_KEY,
      cacheService: mockClassifierCacheService,
      metrics,
    });

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe("classify", () => {
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
        .post("/farcaster/casts/labels/for-text", {
          text_inputs: ["Test comment"],
          label_category: "moderation",
        })
        .matchHeader("Authorization", `Bearer ${API_KEY}`)
        .matchHeader("Content-Type", "application/json")
        .matchHeader("Accept", "application/json")
        .matchHeader("X-Title", "ECP Indexer")
        .matchHeader("HTTP-Referer", "https://api.ethcomments.xyz")
        .reply(200, mockResponse);

      const result = await classifier.classify({
        author: "0x123",
        channelId: 1n,
        content: "Test comment",
        id: "0x123",
        parentId: "0x123",
        references: [],
        targetUri: "https://example.com",
        revision: 0,
      });

      expect(result).toEqual({
        action: "classified",
        score: 0.8,
        labels: {
          spam: 0.1,
          hate: 0.2,
          llm_generated: 0.8,
        },
        save: expect.any(Function),
      });
    });

    it("should handle API errors gracefully", async () => {
      nock("https://api.mbd.xyz/v2")
        .post("/farcaster/casts/labels/for-text")
        .reply(400, { status_code: 400, body: "Error" });

      await expect(
        classifier.classify({
          author: "0x123",
          channelId: 1n,
          content: "Test comment",
          id: "0x123",
          parentId: "0x123",
          references: [],
          targetUri: "https://example.com",
          revision: 0,
        }),
      ).resolves.toEqual({
        action: "skipped",
        score: 0,
        labels: {},
        save: expect.any(Function),
      });

      expect(mockClassifierCacheService.setByCommentId).not.toHaveBeenCalled();
    });

    it("should handle invalid API responses", async () => {
      const invalidResponse = {
        status_code: 200,
        body: [], // Empty body, which is invalid
      };

      nock("https://api.mbd.xyz/v2")
        .post("/farcaster/casts/labels/for-text")
        .reply(200, invalidResponse);

      await expect(
        classifier.classify({
          author: "0x123",
          channelId: 1n,
          content: "Test comment",
          id: "0x123",
          parentId: "0x123",
          references: [],
          targetUri: "https://example.com",
          revision: 0,
        }),
      ).resolves.toEqual({
        action: "skipped",
        score: 0,
        labels: {},
        save: expect.any(Function),
      });

      expect(mockClassifierCacheService.setByCommentId).not.toHaveBeenCalled();
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
        .post("/farcaster/casts/labels/for-text", {
          text_inputs: ["Comment 1", "Comment 2"],
          label_category: "moderation",
        })
        .reply(200, mockResponse);

      const results = await Promise.all([
        classifier.classify({
          author: "0x123",
          channelId: 1n,
          content: "Comment 1",
          id: "0x123",
          parentId: "0x123",
          references: [],
          targetUri: "https://example.com",
          revision: 0,
        }),
        classifier.classify({
          author: "0x123",
          channelId: 1n,
          content: "Comment 2",
          id: "0x123",
          parentId: "0x123",
          references: [],
          targetUri: "https://example.com",
          revision: 0,
        }),
      ]);

      expect(results).toEqual([
        {
          action: "classified",
          score: 0.2,
          labels: {
            spam: 0.1,
            hate: 0.2,
          },
          save: expect.any(Function),
        },
        {
          action: "classified",
          score: 0.9,
          labels: {
            llm_generated: 0.9,
            spam: 0.3,
          },
          save: expect.any(Function),
        },
      ]);
    });
  });

  describe("classifyUpdate", () => {
    it("skips classification if content has not changed", async () => {
      const result = await classifier.classifyUpdate(
        {
          author: "0x123",
          channelId: 1n,
          content: "Unchanged comment",
          id: "0x123",
          parentId: "0x123",
          references: [],
          targetUri: "https://example.com",
          revision: 0,
        },
        {
          content: "Unchanged comment",
          moderationClassifierResult: {},
          moderationClassifierScore: 0,
        },
      );

      expect(result).toEqual({
        action: "skipped",
        score: 0,
        labels: {},
        save: expect.any(Function),
      });

      await result.save();

      expect(mockClassifierCacheService.setByCommentId).not.toHaveBeenCalled();
    });

    it("should classify updated comment successfully", async () => {
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
        .post("/farcaster/casts/labels/for-text", {
          text_inputs: ["Updated comment"],
          label_category: "moderation",
        })
        .matchHeader("Authorization", `Bearer ${API_KEY}`)
        .matchHeader("Content-Type", "application/json")
        .matchHeader("Accept", "application/json")
        .matchHeader("X-Title", "ECP Indexer")
        .matchHeader("HTTP-Referer", "https://api.ethcomments.xyz")
        .reply(200, mockResponse);

      const result = await classifier.classifyUpdate(
        {
          author: "0x123",
          channelId: 1n,
          content: "Updated comment",
          id: "0x123",
          parentId: "0x123",
          references: [],
          targetUri: "https://example.com",
          revision: 0,
        },
        {
          content: "Updated comment edit",
          moderationClassifierResult: {},
          moderationClassifierScore: 0,
        },
      );

      expect(result).toEqual({
        action: "classified",
        score: 0.8,
        labels: {
          spam: 0.1,
          hate: 0.2,
          llm_generated: 0.8,
        },
        save: expect.any(Function),
      });

      await result.save();

      expect(mockClassifierCacheService.setByCommentId).toHaveBeenCalledOnce();
    });

    it("should delete cache entry and skip if classification fails", async () => {
      nock("https://api.mbd.xyz/v2")
        .post("/farcaster/casts/labels/for-text")
        .reply(400, { status_code: 400, body: "Error" });

      const result = await classifier.classifyUpdate(
        {
          author: "0x123",
          channelId: 1n,
          content: "Updated comment",
          id: "0x123",
          parentId: "0x123",
          references: [],
          targetUri: "https://example.com",
          revision: 0,
        },
        {
          content: "Updated comment edit",
          moderationClassifierResult: {},
          moderationClassifierScore: 0,
        },
      );

      expect(result).toEqual({
        action: "skipped",
        score: 0,
        labels: {},
        save: expect.any(Function),
      });

      await result.save();

      expect(mockClassifierCacheService.deleteByCommentId).toHaveBeenCalledWith(
        "0x123",
        0,
      );
    });
  });
});
