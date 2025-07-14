import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentModerationService } from "../../../src/management/services/comment-moderation-service";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import type { Event } from "ponder:registry";
import type { CommentSelectType } from "ponder:schema";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type {
  ICommentModerationClassifierService,
  ICommentPremoderationService,
  IModerationNotificationsService,
  ICommentDbService,
} from "../../../src/services/types";

describe("CommentModerationService", () => {
  // Mock services
  const mockNotificationService: IModerationNotificationsService = {
    notifyPendingModeration: vi.fn(),
    notifyAutomaticallyClassified: vi.fn(),
    updateMessageWithModerationStatus: vi.fn(),
    updateMessageWithChangeAction: vi.fn(),
  };

  const mockPremoderationService: ICommentPremoderationService = {
    moderate: vi.fn(),
    moderateUpdate: vi.fn(),
    updateStatus: vi.fn(),
  };

  const mockClassifierService: ICommentModerationClassifierService = {
    classify: vi.fn(),
    classifyUpdate: vi.fn(),
  };

  const mockCommentDbService: ICommentDbService = {
    getCommentById: vi.fn(),
    updateCommentModerationStatus: vi.fn(),
  };

  const knownReactions = new Set(["👍", "❤️"]);

  let service: CommentModerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommentModerationService({
      knownReactions,
      notificationService: mockNotificationService,
      premoderationService: mockPremoderationService,
      classifierService: mockClassifierService,
      commentDbService: mockCommentDbService,
    });
  });

  describe("moderate", () => {
    const mockComment = {
      commentId: "0x123" as `0x${string}`,
      author: "0xauthor" as `0x${string}`,
      app: "0xapp" as `0x${string}`,
      channelId: BigInt(1),
      content: "Test comment",
      targetUri: "test://uri",
      parentId: "0x0" as `0x${string}`,
      commentType: 0,
      createdAt: BigInt(1),
      authMethod: 0,
      metadata: [],
    } as Event<"CommentsV1:CommentAdded">["args"];

    const mockReferences: IndexerAPICommentReferencesSchemaType = [];

    it("should auto-approve known reactions", async () => {
      const reactionComment = {
        ...mockComment,
        commentType: COMMENT_TYPE_REACTION,
        content: "👍",
      };

      const result = await service.moderate(reactionComment, mockReferences);

      expect(result.result).toEqual({
        status: "approved",
        changedAt: expect.any(Date),
        classifier: {
          score: 0,
          labels: {},
        },
      });

      // Verify no services were called
      expect(mockPremoderationService.moderate).not.toHaveBeenCalled();
      expect(mockClassifierService.classify).not.toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).not.toHaveBeenCalled();
    });

    it("should process regular comments through moderation and classification", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "premoderated",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.1,
        labels: { spam: 0.1 },
        action: "classified",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classify as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);
      (
        mockNotificationService.notifyPendingModeration as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue(123);

      const result = await service.moderate(mockComment, mockReferences);

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.1,
          labels: { spam: 0.1 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderate).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });

      expect(mockClassifierService.classify).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).toHaveBeenCalled();
    });

    it("should not send notifications when premoderation is skipped", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "skipped",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.1,
        labels: { spam: 0.1 },
        action: "classified",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classify as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);

      const result = await service.moderate(mockComment, mockReferences);

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.1,
          labels: { spam: 0.1 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderate).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });

      expect(mockClassifierService.classify).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).not.toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).toHaveBeenCalled();
    });

    it("should not send notifications when classification is skipped", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "premoderated",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.1,
        labels: { spam: 0.1 },
        action: "skipped",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classify as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);
      (
        mockNotificationService.notifyPendingModeration as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue(123);

      const result = await service.moderate(mockComment, mockReferences);

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.1,
          labels: { spam: 0.1 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderate).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });

      expect(mockClassifierService.classify).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).not.toHaveBeenCalled();
    });

    it("should not send any notifications when both premoderation and classification are skipped", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "skipped",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.1,
        labels: { spam: 0.1 },
        action: "skipped",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classify as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);

      const result = await service.moderate(mockComment, mockReferences);

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.1,
          labels: { spam: 0.1 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderate).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });

      expect(mockClassifierService.classify).toHaveBeenCalledWith({
        author: mockComment.author,
        channelId: mockComment.channelId,
        content: mockComment.content,
        id: mockComment.commentId,
        parentId: mockComment.parentId,
        references: mockReferences,
        targetUri: mockComment.targetUri,
      });
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).not.toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).not.toHaveBeenCalled();
    });
  });

  describe("moderateUpdate", () => {
    const mockComment = {
      commentId: "0x123" as `0x${string}`,
      author: "0xauthor" as `0x${string}`,
      editedByApp: "0xapp" as `0x${string}`,
      channelId: BigInt(1),
      content: "Updated comment",
      targetUri: "test://uri",
      parentId: "0x0" as `0x${string}`,
      commentType: 0,
      createdAt: BigInt(1),
      updatedAt: BigInt(2),
      authMethod: 0,
      metadata: [],
    } as Event<"CommentsV1:CommentEdited">["args"];

    const mockExistingComment = {
      id: "0x123" as `0x${string}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      channelId: BigInt(1),
      content: "Original comment",
      metadata: null,
      hookMetadata: null,
      moderationStatus: "approved" as const,
      moderationStatusChangedAt: new Date(),
      moderationClassifierScore: 0,
      moderationClassifierResult: {},
      reactionCounts: {},
      author: "0xauthor" as `0x${string}`,
      app: "0xapp" as `0x${string}`,
      targetUri: "test://uri",
      parentId: "0x0" as `0x${string}`,
      commentType: 0,
      authMethod: 0,
      isDeleted: false,
      isHidden: false,
      isSpam: false,
      threadId: "0x0" as `0x${string}`,
      subCount: 0,
      replyToId: null,
      rootCommentId: "0x0" as `0x${string}`,
      deletedAt: null,
      chainId: 1,
      txHash: "0x0" as `0x${string}`,
      blockNumber: BigInt(1),
      logIndex: 0,
      transactionIndex: 0,
    } as unknown as CommentSelectType;

    const mockReferences: IndexerAPICommentReferencesSchemaType = [];

    it("should return existing moderation status if content hasn't changed", async () => {
      const unchangedComment = {
        ...mockComment,
        content: mockExistingComment.content,
      };

      const result = await service.moderateUpdate({
        comment: unchangedComment,
        references: mockReferences,
        existingComment: mockExistingComment,
      });

      expect(result.result).toEqual({
        status: mockExistingComment.moderationStatus,
        changedAt: mockExistingComment.moderationStatusChangedAt,
        classifier: {
          score: mockExistingComment.moderationClassifierScore,
          labels: mockExistingComment.moderationClassifierResult,
        },
      });

      // Verify no services were called
      expect(mockPremoderationService.moderateUpdate).not.toHaveBeenCalled();
      expect(mockClassifierService.classifyUpdate).not.toHaveBeenCalled();
    });

    it("should process updated comments through moderation and classification", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "premoderated",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.2,
        labels: { spam: 0.2 },
        action: "classified",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderateUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classifyUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);
      (
        mockNotificationService.notifyPendingModeration as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue(123);

      const result = await service.moderateUpdate({
        comment: mockComment,
        references: mockReferences,
        existingComment: mockExistingComment,
      });

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.2,
          labels: { spam: 0.2 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderateUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );

      expect(mockClassifierService.classifyUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).toHaveBeenCalled();
    });

    it("should not send notifications when premoderation is skipped for updates", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "skipped",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.2,
        labels: { spam: 0.2 },
        action: "classified",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderateUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classifyUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);

      const result = await service.moderateUpdate({
        comment: mockComment,
        references: mockReferences,
        existingComment: mockExistingComment,
      });

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.2,
          labels: { spam: 0.2 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderateUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );

      expect(mockClassifierService.classifyUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).not.toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).toHaveBeenCalled();
    });

    it("should not send notifications when classification is skipped for updates", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "premoderated",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.2,
        labels: { spam: 0.2 },
        action: "skipped",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderateUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classifyUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);
      (
        mockNotificationService.notifyPendingModeration as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue(123);

      const result = await service.moderateUpdate({
        comment: mockComment,
        references: mockReferences,
        existingComment: mockExistingComment,
      });

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.2,
          labels: { spam: 0.2 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderateUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );

      expect(mockClassifierService.classifyUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).not.toHaveBeenCalled();
    });

    it("should not send any notifications when both premoderation and classification are skipped for updates", async () => {
      const mockPremoderationResult = {
        status: "pending" as const,
        changedAt: new Date(),
        action: "skipped",
        save: vi.fn(),
      };

      const mockClassifierResult = {
        score: 0.2,
        labels: { spam: 0.2 },
        action: "skipped",
        save: vi.fn(),
      };

      (
        mockPremoderationService.moderateUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPremoderationResult);
      (
        mockClassifierService.classifyUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockClassifierResult);

      const result = await service.moderateUpdate({
        comment: mockComment,
        references: mockReferences,
        existingComment: mockExistingComment,
      });

      expect(result.result).toEqual({
        status: "pending",
        changedAt: expect.any(Date),
        classifier: {
          score: 0.2,
          labels: { spam: 0.2 },
        },
      });

      await result.saveAndNotify();

      expect(mockPremoderationService.moderateUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );

      expect(mockClassifierService.classifyUpdate).toHaveBeenCalledWith(
        {
          author: mockComment.author,
          channelId: mockComment.channelId,
          content: mockComment.content,
          id: mockComment.commentId,
          parentId: mockComment.parentId,
          references: mockReferences,
          targetUri: mockComment.targetUri,
        },
        mockExistingComment,
      );
      expect(mockPremoderationResult.save).toHaveBeenCalled();
      expect(mockClassifierResult.save).toHaveBeenCalled();
      expect(
        mockNotificationService.notifyPendingModeration,
      ).not.toHaveBeenCalled();
      expect(
        mockNotificationService.notifyAutomaticallyClassified,
      ).not.toHaveBeenCalled();
    });
  });

  describe("updateModerationStatus", () => {
    it("should update moderation status through premoderation service", async () => {
      const commentId = "0x123" as `0x${string}`;
      const status = "approved" as const;
      const mockUpdatedComment = { id: commentId, moderationStatus: status };

      (
        mockPremoderationService.updateStatus as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockUpdatedComment);

      const result = await service.updateModerationStatus({
        commentId,
        messageId: undefined,
        status,
      });

      expect(result).toEqual(mockUpdatedComment);
      expect(mockPremoderationService.updateStatus).toHaveBeenCalledWith(
        commentId,
        status,
      );
    });
  });
});
