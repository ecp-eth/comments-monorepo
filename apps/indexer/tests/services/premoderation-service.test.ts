import { describe, test, expect, vi, beforeEach } from "vitest";
import { PremoderationService } from "../../src/services/premoderation-service";
import type {
  IPremoderationCacheService,
  ICommentDbService,
  ModerationStatus,
  ModerationNotificationServicePendingComment,
  PremoderationCacheServiceStatus,
} from "../../src/services/types";
import type { CommentSelectType } from "ponder:schema";
import type { Hex } from "@ecp.eth/sdk/core";

// Mock services
const mockCacheService = {
  getStatusByCommentId: vi.fn(),
  setStatusByCommentId: vi.fn(),
  insertStatusByCommentId: vi.fn(),
} as IPremoderationCacheService;

const mockDbService = {
  updateCommentModerationStatus: vi.fn(),
  getCommentById: vi.fn(),
} as ICommentDbService;

describe("PremoderationService", () => {
  let service: PremoderationService;
  const defaultModerationStatus: ModerationStatus = "pending";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PremoderationService({
      defaultModerationStatus,
      cacheService: mockCacheService,
      dbService: mockDbService,
    });
  });

  describe("moderate", () => {
    test("should return cached status if it exists", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "test comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
      };
      const mockCachedStatus: PremoderationCacheServiceStatus = {
        status: "approved",
        changedAt: new Date(),
      };

      vi.mocked(mockCacheService.getStatusByCommentId).mockResolvedValueOnce(
        mockCachedStatus,
      );

      const result = await service.moderate(mockComment);

      expect(result).toEqual({
        action: "skipped",
        status: mockCachedStatus.status,
        changedAt: mockCachedStatus.changedAt,
        save: expect.any(Function),
      });
      expect(mockCacheService.getStatusByCommentId).toHaveBeenCalledWith(
        mockComment.id,
      );
      expect(mockCacheService.insertStatusByCommentId).not.toHaveBeenCalled();
    });

    test("should return default status if no cached status exists", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "test comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
      };

      vi.mocked(mockCacheService.getStatusByCommentId).mockResolvedValueOnce(
        undefined,
      );

      const result = await service.moderate(mockComment);

      expect(result).toEqual({
        action: "premoderated",
        status: defaultModerationStatus,
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      // Test save function
      await result.save();
      expect(mockCacheService.insertStatusByCommentId).toHaveBeenCalledWith(
        mockComment.id,
        {
          status: defaultModerationStatus,
          changedAt: expect.any(Date),
        },
      );
    });
  });

  describe("moderateUpdate", () => {
    test("should keep existing status if content hasn't changed", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "test comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
      };
      const mockExistingComment = {
        id: "0x123" as Hex,
        content: "test comment",
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;

      const result = await service.moderateUpdate(
        mockComment,
        mockExistingComment,
      );

      expect(result).toEqual({
        action: "skipped",
        status: mockExistingComment.moderationStatus,
        changedAt: mockExistingComment.moderationStatusChangedAt,
        save: expect.any(Function),
      });
      expect(mockCacheService.setStatusByCommentId).not.toHaveBeenCalled();
    });

    test("should set status to pending if content has changed", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "updated comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
      };
      const mockExistingComment = {
        id: "0x123" as Hex,
        content: "original comment",
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;

      const result = await service.moderateUpdate(
        mockComment,
        mockExistingComment,
      );

      expect(result).toEqual({
        action: "premoderated",
        status: "pending",
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      // Test save function
      await result.save();
      expect(mockCacheService.setStatusByCommentId).toHaveBeenCalledWith(
        mockComment.id,
        {
          status: "pending",
          changedAt: expect.any(Date),
        },
      );
    });
  });

  describe("updateStatus", () => {
    test("should update comment moderation status", async () => {
      const commentId = "0x123" as Hex;
      const newStatus: ModerationStatus = "approved";
      const mockUpdatedComment = {
        id: commentId,
        moderationStatus: newStatus,
      } as CommentSelectType;

      vi.mocked(
        mockDbService.updateCommentModerationStatus,
      ).mockResolvedValueOnce(mockUpdatedComment);

      const result = await service.updateStatus(commentId, newStatus);

      expect(result).toBe(mockUpdatedComment);
      expect(mockDbService.updateCommentModerationStatus).toHaveBeenCalledWith(
        commentId,
        newStatus,
      );
    });

    test("should handle undefined result from db service", async () => {
      const commentId = "0x123" as Hex;
      const newStatus: ModerationStatus = "approved";

      vi.mocked(
        mockDbService.updateCommentModerationStatus,
      ).mockResolvedValueOnce(undefined);

      const result = await service.updateStatus(commentId, newStatus);

      expect(result).toBeUndefined();
      expect(mockDbService.updateCommentModerationStatus).toHaveBeenCalledWith(
        commentId,
        newStatus,
      );
    });
  });
});
