import { describe, test, expect, vi, beforeEach } from "vitest";
import { CommentReferencesResolutionService } from "../../src/services/comment-references-resolution-service";
import { CommentReferencesCacheService } from "../../src/services/comment-references-cache-service";
import type { Hex } from "@ecp.eth/sdk/core";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { CommentSelectType } from "ponder:schema";
import {
  type ENSByAddressResolver,
  type ENSByNameResolver,
  type ERC20ByTickerResolver,
  type ERC20ByAddressResolver,
  type FarcasterByAddressResolver,
  type FarcasterByNameResolver,
  type URLResolver,
} from "../../src/resolvers";
import { IPFSResolver } from "../../src/resolvers/ipfs-resolver";

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
  ipfsResolver: {} as IPFSResolver,
};

const service = new CommentReferencesResolutionService({
  resolveCommentReferences: mockResolveCommentReferences,
  commentReferencesResolvers: mockResolvers,
  commentReferencesCacheService: mockCacheService,
});

describe("CommentReferencesResolutionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
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

  describe("resolveFromNetworkFirst", () => {
    describe("given no cached result", () => {
      test("should resolve from network and cache success result", async () => {
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

        vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
          references: mockReference,
          status: mockStatus,
          allResolvedPositions: [{ start: 0, end: 10 }],
        });

        // no cached result
        vi.mocked(
          mockCacheService.getReferenceResolutionResult,
        ).mockResolvedValueOnce(null);

        const result = await service.resolveFromNetworkFirst({
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

      test("should handle failed network resolution with no cached result", async () => {
        const mockCommentId = "0x123" as Hex;
        const mockCommentRevision = 0;

        vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
          references: [],
          status: "failed",
          allResolvedPositions: [],
        });
        vi.mocked(
          mockCacheService.getReferenceResolutionResult,
        ).mockResolvedValueOnce(null);

        const result = await service.resolveFromNetworkFirst({
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

    describe("given cached partial result", () => {
      describe("and the network fetch result is partial as well", () => {
        test("should merge partial network result with cached partial result", async () => {
          const mockCommentId = "0x123" as Hex;
          const mockCommentRevision = 0;

          const networkReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "image",
              url: "https://example.com/image1.png",
              position: { start: 0, end: 10 },
              mediaType: "image/png",
            },
          ];

          const cachedReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "webpage",
              url: "https://example.com/page",
              position: { start: 15, end: 25 },
              title: "Example Page",
              description: "An example webpage",
              favicon: null,
              opengraph: null,
              mediaType: "text/html",
            },
          ];

          vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
            references: networkReference,
            status: "partial",
            allResolvedPositions: [
              { start: 0, end: 10 },
              { start: 15, end: 25 },
            ],
          });

          vi.mocked(
            mockCacheService.getReferenceResolutionResult,
          ).mockResolvedValueOnce({
            references: cachedReference,
            referencesResolutionStatus: "partial",
            updatedAt: new Date(),
          });

          const result = await service.resolveFromNetworkFirst({
            commentId: mockCommentId,
            commentRevision: mockCommentRevision,
            content: "test content",
            chainId: 1,
          });

          const expectedMergedReferences: IndexerAPICommentReferencesSchemaType =
            [
              {
                type: "image",
                url: "https://example.com/image1.png",
                position: { start: 0, end: 10 },
                mediaType: "image/png",
              },
              {
                type: "webpage",
                url: "https://example.com/page",
                position: { start: 15, end: 25 },
                title: "Example Page",
                description: "An example webpage",
                favicon: null,
                opengraph: null,
                mediaType: "text/html",
              },
            ];

          expect(result).toEqual({
            references: expectedMergedReferences,
            status: "success", // All positions are now resolved
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
            references: expectedMergedReferences,
            referencesResolutionStatus: "success",
          });
        });

        test("should merge partial network result with overlapping cached references", async () => {
          const mockCommentId = "0x123" as Hex;
          const mockCommentRevision = 0;

          const networkReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "image",
              url: "https://example.com/image1.png",
              position: { start: 0, end: 10 },
              mediaType: "image/png",
            },
          ];

          const cachedReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "image",
              url: "https://example.com/image1.png",
              position: { start: 0, end: 10 },
              mediaType: "image/png",
            },
            {
              type: "webpage",
              url: "https://example.com/page",
              position: { start: 15, end: 25 },
              title: "Example Page",
              description: "An example webpage",
              favicon: null,
              opengraph: null,
              mediaType: "text/html",
            },
            {
              type: "webpage",
              url: "https://example.com/another",
              position: { start: 30, end: 40 },
              title: "Another Page",
              description: "Another example webpage",
              favicon: null,
              opengraph: null,
              mediaType: "text/html",
            },
          ];

          vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
            references: networkReference,
            status: "partial",
            allResolvedPositions: [
              { start: 0, end: 10 },
              { start: 15, end: 25 },
              { start: 30, end: 40 },
            ],
          });

          vi.mocked(
            mockCacheService.getReferenceResolutionResult,
          ).mockResolvedValueOnce({
            references: cachedReference,
            referencesResolutionStatus: "partial",
            updatedAt: new Date(),
          });

          const result = await service.resolveFromNetworkFirst({
            commentId: mockCommentId,
            commentRevision: mockCommentRevision,
            content: "test content",
            chainId: 1,
          });

          const expectedMergedReferences: IndexerAPICommentReferencesSchemaType =
            [
              {
                type: "image",
                url: "https://example.com/image1.png",
                position: { start: 0, end: 10 },
                mediaType: "image/png",
              },
              {
                type: "webpage",
                url: "https://example.com/page",
                position: { start: 15, end: 25 },
                title: "Example Page",
                description: "An example webpage",
                favicon: null,
                opengraph: null,
                mediaType: "text/html",
              },
              {
                type: "webpage",
                url: "https://example.com/another",
                position: { start: 30, end: 40 },
                title: "Another Page",
                description: "Another example webpage",
                favicon: null,
                opengraph: null,
                mediaType: "text/html",
              },
            ];

          expect(result).toEqual({
            references: expectedMergedReferences,
            status: "success", // All resolved positions are covered
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
            references: expectedMergedReferences,
            referencesResolutionStatus: "success",
          });
        });

        test("should handle partial network result with incomplete position coverage", async () => {
          const mockCommentId = "0x123" as Hex;
          const mockCommentRevision = 0;

          const networkReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "image",
              url: "https://example.com/image1.png",
              position: { start: 0, end: 10 },
              mediaType: "image/png",
            },
          ];

          const cachedReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "webpage",
              url: "https://example.com/page",
              position: { start: 15, end: 25 },
              title: "Example Page",
              description: "An example webpage",
              favicon: null,
              opengraph: null,
              mediaType: "text/html",
            },
          ];

          vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
            references: networkReference,
            status: "partial",
            allResolvedPositions: [
              { start: 0, end: 10 },
              { start: 15, end: 25 },
              { start: 30, end: 40 }, // This position is not covered by either network or cache
            ],
          });

          vi.mocked(
            mockCacheService.getReferenceResolutionResult,
          ).mockResolvedValueOnce({
            references: cachedReference,
            referencesResolutionStatus: "partial",
            updatedAt: new Date(),
          });

          const result = await service.resolveFromNetworkFirst({
            commentId: mockCommentId,
            commentRevision: mockCommentRevision,
            content: "test content",
            chainId: 1,
          });

          const expectedMergedReferences: IndexerAPICommentReferencesSchemaType =
            [
              {
                type: "image",
                url: "https://example.com/image1.png",
                position: { start: 0, end: 10 },
                mediaType: "image/png",
              },
              {
                type: "webpage",
                url: "https://example.com/page",
                position: { start: 15, end: 25 },
                title: "Example Page",
                description: "An example webpage",
                favicon: null,
                opengraph: null,
                mediaType: "text/html",
              },
            ];

          expect(result).toEqual({
            references: expectedMergedReferences,
            status: "partial", // Not all positions are covered (missing 30-40)
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
            references: expectedMergedReferences,
            referencesResolutionStatus: "partial",
          });
        });
      });
    });

    describe("given cached success result", () => {
      describe("and the network fetched result is partial", () => {
        test("should just use cached success result", async () => {
          const mockCommentId = "0x123" as Hex;
          const mockCommentRevision = 0;

          const networkReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "image",
              url: "https://example.com/image1.png",
              position: { start: 0, end: 10 },
              mediaType: "image/png",
            },
          ];

          const cachedReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "image",
              url: "https://example.com/image1.png",
              position: { start: 0, end: 10 },
              mediaType: "image/png",
            },
            {
              type: "webpage",
              url: "https://example.com/page",
              position: { start: 15, end: 25 },
              title: "Example Page",
              description: "An example webpage",
              favicon: null,
              opengraph: null,
              mediaType: "text/html",
            },
          ];

          vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
            references: networkReference,
            status: "partial",
            allResolvedPositions: [
              { start: 0, end: 10 },
              { start: 15, end: 25 },
            ],
          });

          vi.mocked(
            mockCacheService.getReferenceResolutionResult,
          ).mockResolvedValueOnce({
            references: cachedReference,
            referencesResolutionStatus: "success",
            updatedAt: new Date(),
          });

          const result = await service.resolveFromNetworkFirst({
            commentId: mockCommentId,
            commentRevision: mockCommentRevision,
            content: "test content",
            chainId: 1,
          });

          expect(result).toEqual({
            references: cachedReference, // Should return cached references since all positions are covered
            status: "success",
          });
          expect(mockResolveCommentReferences).toHaveBeenCalledOnce();
          expect(
            mockCacheService.updateReferenceResolutionResult,
          ).not.toHaveBeenCalledOnce();
        });
      });

      describe("and the network fetch result is a complete failure", () => {
        test("should just use cached result", async () => {
          const mockCommentId = "0x123" as Hex;
          const mockCommentRevision = 0;

          const cachedReference: IndexerAPICommentReferencesSchemaType = [
            {
              type: "image",
              url: "https://example.com/image1.png",
              position: { start: 0, end: 10 },
              mediaType: "image/png",
            },
          ];

          vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
            references: [],
            status: "failed",
            allResolvedPositions: [],
          });

          vi.mocked(
            mockCacheService.getReferenceResolutionResult,
          ).mockResolvedValueOnce({
            references: cachedReference,
            referencesResolutionStatus: "success",
            updatedAt: new Date(),
          });

          const result = await service.resolveFromNetworkFirst({
            commentId: mockCommentId,
            commentRevision: mockCommentRevision,
            content: "test content",
            chainId: 1,
          });

          expect(result).toEqual({
            references: cachedReference,
            status: "success",
          });
          expect(mockResolveCommentReferences).toHaveBeenCalledOnce();
          expect(
            mockCacheService.updateReferenceResolutionResult,
          ).not.toHaveBeenCalledOnce();
        });
      });
    });

    describe("given cached failed result", () => {
      test("should use partial network result and cache it", async () => {
        const mockCommentId = "0x123" as Hex;
        const mockCommentRevision = 0;

        const networkReference: IndexerAPICommentReferencesSchemaType = [
          {
            type: "image",
            url: "https://example.com/image1.png",
            position: { start: 0, end: 10 },
            mediaType: "image/png",
          },
        ];

        vi.mocked(mockResolveCommentReferences).mockResolvedValueOnce({
          references: networkReference,
          status: "partial",
          allResolvedPositions: [{ start: 0, end: 10 }],
        });

        vi.mocked(
          mockCacheService.getReferenceResolutionResult,
        ).mockResolvedValueOnce({
          references: [],
          referencesResolutionStatus: "failed",
          updatedAt: new Date(),
        });

        const result = await service.resolveFromNetworkFirst({
          commentId: mockCommentId,
          commentRevision: mockCommentRevision,
          content: "test content",
          chainId: 1,
        });

        expect(result).toEqual({
          references: networkReference,
          status: "partial",
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
          references: networkReference,
          referencesResolutionStatus: "partial",
        });
      });
    });
  });
});
