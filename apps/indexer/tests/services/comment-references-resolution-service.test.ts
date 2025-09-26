import { describe, test, expect, vi, beforeEach } from "vitest";
import { CommentReferencesResolutionService } from "../../src/services/comment-references-resolution-service";
import { CommentReferencesCacheService } from "../../src/services/comment-references-cache-service";
import type { Hex } from "@ecp.eth/sdk/core";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { CommentSelectType } from "ponder:schema";
import {
  ENSByAddressResolver,
  ENSByNameResolver,
  ERC20ByTickerResolver,
  ERC20ByAddressResolver,
  FarcasterByAddressResolver,
  FarcasterByNameResolver,
  URLResolver,
} from "../../src/resolvers";

// Mock the cache service
const mockCacheService = {
  getReferenceResolutionResult: vi.fn(),
  updateReferenceResolutionResult: vi.fn(),
} as unknown as CommentReferencesCacheService;

// Mock the resolve function
const mockResolveCommentReferences = vi.fn();

// Mock resolvers
const mockResolvers = {
  ensByAddressResolver: {} as ENSByAddressResolver,
  ensByNameResolver: {} as ENSByNameResolver,
  erc20ByAddressResolver: {} as ERC20ByAddressResolver,
  erc20ByTickerResolver: {} as ERC20ByTickerResolver,
  farcasterByAddressResolver: {} as FarcasterByAddressResolver,
  farcasterByNameResolver: {} as FarcasterByNameResolver,
  urlResolver: {} as URLResolver,
};

const service = new CommentReferencesResolutionService({
  resolveCommentReferences: mockResolveCommentReferences,
  commentReferencesResolvers: mockResolvers,
  commentReferencesCacheService: mockCacheService,
});

describe("CommentReferencesResolutionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveFromCacheFirst", () => {
    test("should return cached result if available", async () => {
      const mockCommentId = "0x123" as Hex;
      const mockCommentRevision = 0;
      const mockReference: IndexerAPICommentReferencesSchemaType = [
        {
          type: "image",
          url: "https://example.com",
          position: { start: 0, end: 10 },
          mediaType: "image/png",
        },
      ];
      const mockStatus: CommentSelectType["referencesResolutionStatus"] =
        "success";

      vi.mocked(
        mockCacheService.getReferenceResolutionResult,
      ).mockResolvedValueOnce({
        references: mockReference,
        referencesResolutionStatus: mockStatus,
        updatedAt: new Date(),
      });

      const result = await service.resolveFromCacheFirst({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
        content: "test content",
        chainId: 1,
      });

      expect(result).toEqual({
        references: mockReference,
        status: mockStatus,
      });
      expect(mockResolveCommentReferences).not.toHaveBeenCalled();
      expect(
        mockCacheService.updateReferenceResolutionResult,
      ).not.toHaveBeenCalled();
    });

    test("should resolve and cache if no cached result", async () => {
      const mockCommentId = "0x123" as Hex;
      const mockCommentRevision = 0;
      const mockReference: IndexerAPICommentReferencesSchemaType = [
        {
          type: "image",
          url: "https://example.com",
          position: { start: 0, end: 10 },
          mediaType: "image/png",
        },
      ];
      const mockStatus: CommentSelectType["referencesResolutionStatus"] =
        "success";

      vi.mocked(
        mockCacheService.getReferenceResolutionResult,
      ).mockResolvedValueOnce(null);
      vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
        references: mockReference,
        status: mockStatus,
      });

      const result = await service.resolveFromCacheFirst({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
        content: "test content",
        chainId: 1,
      });

      expect(result).toEqual({
        references: mockReference,
        status: mockStatus,
      });
      expect(mockResolveCommentReferences).toHaveBeenCalledOnce();
      expect(mockResolveCommentReferences).toHaveBeenCalledWith(
        {
          content: "test content",
          chainId: 1,
        },
        mockResolvers,
      );
      expect(
        mockCacheService.updateReferenceResolutionResult,
      ).toHaveBeenCalledOnce();
      expect(
        mockCacheService.updateReferenceResolutionResult,
      ).toHaveBeenCalledWith({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
        references: mockReference,
        referencesResolutionStatus: mockStatus,
      });
    });

    test("should handle resolution failure and cache failed result", async () => {
      const mockCommentId = "0x123" as Hex;
      const mockCommentRevision = 0;

      vi.mocked(
        mockCacheService.getReferenceResolutionResult,
      ).mockResolvedValueOnce(null);
      vi.mocked(mockResolveCommentReferences).mockRejectedValueOnce(
        new Error("Resolution failed"),
      );

      const result = await service.resolveFromCacheFirst({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
        content: "test content",
        chainId: 1,
      });

      expect(result).toEqual({
        references: [],
        status: "failed",
      });
      expect(mockResolveCommentReferences).toHaveBeenCalledOnce();
      expect(
        mockCacheService.updateReferenceResolutionResult,
      ).toHaveBeenCalledOnce();
      expect(
        mockCacheService.updateReferenceResolutionResult,
      ).toHaveBeenCalledWith({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
        references: [],
        referencesResolutionStatus: "failed",
      });
    });
  });
});
