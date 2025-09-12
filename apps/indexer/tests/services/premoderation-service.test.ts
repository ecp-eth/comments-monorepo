import { describe, test, expect, vi, beforeEach } from "vitest";
import { PremoderationService } from "../../src/services/premoderation-service";
import type {
  ModerationStatus,
  ModerationNotificationServicePendingComment,
  CommentModerationClassfierResult,
} from "../../src/services/types";
import type { CommentSelectType } from "ponder:schema";
import type { Hex } from "@ecp.eth/sdk/core";
import {
  drizzle,
  type NodePgClient,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { schema } from "../../schema";
import type { CommentModerationStatusesSelectType } from "../../schema.offchain";

const db = drizzle.mock({
  schema,
}) as unknown as NodePgDatabase<typeof schema> & { $client: NodePgClient };

const { eventOutboxService } = await vi.importMock<
  typeof import("../../src/services/index.ts")
>("../../src/services/index.ts");

const service = new PremoderationService({
  classificationThreshold: 50,
  db,
  eventOutboxService,
});

const mockLowerRiskClassifierResult: CommentModerationClassfierResult = {
  score: 0.49,
  labels: { spam: 0.49 },
  action: "classified",
  save: vi.fn(),
};

const mockHighRiskClassifierResult: CommentModerationClassfierResult = {
  score: 0.51,
  labels: { spam: 0.51 },
  action: "classified",
  save: vi.fn(),
};

const mockSkippedLowRiskClassifierResult: CommentModerationClassfierResult = {
  score: 0,
  labels: { spam: 0 },
  action: "skipped",
  save: vi.fn(),
};

const commentFindFirstMock = vi.spyOn(db.query.comment, "findFirst");
const commentModerationStatusesFindFirstMock = vi.spyOn(
  db.query.commentModerationStatuses,
  "findFirst",
);
const dbExecuteInsertMock = vi.fn();
const dbReturningMock = vi.fn().mockImplementation(() => {
  return {
    execute: dbExecuteInsertMock,
  };
});
const dbInsertOnConflictDoUpdateMock = vi.fn().mockImplementation(() => {
  return {
    execute: dbExecuteInsertMock,
  };
});
const dbInsertValuesMock = vi.fn().mockImplementation(() => {
  return {
    execute: dbExecuteInsertMock,
    returning: dbReturningMock,
    onConflictDoUpdate: dbInsertOnConflictDoUpdateMock,
  };
});
const dbInsertMock = vi.spyOn(db, "insert").mockImplementation(() => {
  return {
    values: dbInsertValuesMock,
  } as any;
});

const dbUpdateExecuteMock = vi.fn();

const dbUpdateReturningMock = vi.fn().mockImplementation(() => {
  return {
    execute: dbUpdateExecuteMock,
  };
});

const dbUpdateWhereMock = vi.fn().mockImplementation(() => {
  return {
    returning: dbUpdateReturningMock,
    execute: dbUpdateExecuteMock,
  };
});
const dbUpdateSetMock = vi.fn().mockImplementation(() => {
  return {
    where: dbUpdateWhereMock,
  } as any;
});

const dbUpdateMock = vi.spyOn(db, "update").mockImplementation(() => {
  return {
    set: dbUpdateSetMock,
  } as any;
});

vi.spyOn(db, "transaction").mockImplementation((callback) => {
  return callback(db as any);
});

describe("PremoderationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        revision: 0,
      };

      const mockCachedStatus: CommentModerationStatusesSelectType = {
        createdAt: new Date(),
        moderationStatus: "approved",
        updatedAt: new Date(),
        revision: 0,
        commentId: "0x123" as Hex,
        updatedBy: "premoderation",
      };

      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        mockCachedStatus,
      );

      const result = await service.moderate(
        mockComment,
        mockHighRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "skipped",
        status: mockCachedStatus.moderationStatus,
        changedAt: mockCachedStatus.updatedAt,
        save: expect.any(Function),
      });
      expect(dbExecuteInsertMock).not.toHaveBeenCalled();
    });

    test("should return pending status given no cached status exists and classifier result is higher than threshold", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "test comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
        revision: 0,
      };

      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        undefined,
      );

      const result = await service.moderate(
        mockComment,
        mockHighRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "premoderated",
        status: "pending",
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      // Test save function
      await result.save();
      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: mockComment.id,
        moderationStatus: "pending",
        updatedAt: expect.any(Date),
        revision: mockComment.revision,
        updatedBy: "premoderation",
      });
    });

    test("should return approved status given no cached status exists and classifier result is lower than threshold", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "test comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
        revision: 0,
      };

      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        undefined,
      );

      const result = await service.moderate(
        mockComment,
        mockLowerRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "premoderated",
        status: "approved",
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      // Test save function
      await result.save();
      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: mockComment.id,
        moderationStatus: "approved",
        updatedAt: expect.any(Date),
        revision: mockComment.revision,
        updatedBy: "premoderation",
      });
    });

    test("should return pending status no matter the risk score given classifier result is skipped", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "test comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
        revision: 0,
      };

      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        undefined,
      );

      const result = await service.moderate(
        mockComment,
        mockSkippedLowRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "premoderated",
        status: "pending",
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      // Test save function
      await result.save();
      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: mockComment.id,
        moderationStatus: "pending",
        updatedAt: expect.any(Date),
        revision: mockComment.revision,
        updatedBy: "premoderation",
      });
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
        revision: 0,
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
        mockHighRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "skipped",
        status: mockExistingComment.moderationStatus,
        changedAt: mockExistingComment.moderationStatusChangedAt,
        save: expect.any(Function),
      });
      expect(dbExecuteInsertMock).not.toHaveBeenCalled();
      expect(eventOutboxService.publishEvent).not.toHaveBeenCalled();
    });

    test("should set status to pending given the change is higher risk than the threshold", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "updated comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
        revision: 0,
      };
      const mockExistingComment = {
        id: "0x123" as Hex,
        content: "original comment",
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;

      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        undefined,
      );

      const result = await service.moderateUpdate(
        mockComment,
        mockExistingComment,
        mockHighRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "premoderated",
        status: "pending",
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      await result.save();

      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: mockComment.id,
        moderationStatus: "pending",
        updatedAt: expect.any(Date),
        revision: mockComment.revision,
        updatedBy: "premoderation",
      });
    });

    test("should set status to pending given the change is lower risk than the threshold", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "updated comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
        revision: 0,
      };
      const mockExistingComment = {
        id: "0x123" as Hex,
        content: "original comment",
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;

      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        undefined,
      );

      const result = await service.moderateUpdate(
        mockComment,
        mockExistingComment,
        mockLowerRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "premoderated",
        status: "approved",
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      await result.save();

      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: mockComment.id,
        moderationStatus: "approved",
        updatedAt: expect.any(Date),
        revision: mockComment.revision,
        updatedBy: "premoderation",
      });
    });

    test("should set status to pending no matter the risk score given classifier result is skipped", async () => {
      const mockComment: ModerationNotificationServicePendingComment = {
        id: "0x123" as Hex,
        content: "updated comment",
        channelId: BigInt(1),
        author: "0x456" as Hex,
        references: [],
        targetUri: "test://uri",
        parentId: "0x789" as Hex,
        revision: 0,
      };
      const mockExistingComment = {
        id: "0x123" as Hex,
        content: "original comment",
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;

      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        undefined,
      );

      const result = await service.moderateUpdate(
        mockComment,
        mockExistingComment,
        mockSkippedLowRiskClassifierResult,
      );

      expect(result).toEqual({
        action: "premoderated",
        status: "pending",
        changedAt: expect.any(Date),
        save: expect.any(Function),
      });

      await result.save();

      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: mockComment.id,
        moderationStatus: "pending",
        updatedAt: expect.any(Date),
        revision: mockComment.revision,
        updatedBy: "premoderation",
      });
    });
  });

  describe("updateStatus", () => {
    test("should throw error if comment moderation status is not found", async () => {
      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce(
        undefined,
      );

      await expect(
        service.updateStatus({
          commentId: "0x123" as Hex,
          commentRevision: undefined,
          status: "approved" as ModerationStatus,
          updatedBy: "premoderation",
        }),
      ).rejects.toThrow("Comment moderation status not found");
    });

    test("should throw error if comment is not found", async () => {
      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce({
        commentId: "0x123" as Hex,
        moderationStatus: "pending" as ModerationStatus,
        updatedAt: new Date(),
        revision: 0,
      } as CommentModerationStatusesSelectType);
      vi.mocked(commentFindFirstMock).mockResolvedValueOnce(undefined);

      await expect(
        service.updateStatus({
          commentId: "0x123" as Hex,
          commentRevision: undefined,
          status: "approved" as ModerationStatus,
          updatedBy: "premoderation",
        }),
      ).rejects.toThrow("Comment 0x123 not found");
    });

    test("should just return the comment as is if status is the same as the one provided", async () => {
      const mockedComment = {
        id: "0x123" as Hex,
        content: "test comment",
        moderationStatus: "pending" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;
      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce({
        commentId: "0x123" as Hex,
        moderationStatus: "pending" as ModerationStatus,
        updatedAt: new Date(),
        revision: 0,
      } as CommentModerationStatusesSelectType);
      vi.mocked(commentFindFirstMock).mockResolvedValueOnce(mockedComment);

      const result = await service.updateStatus({
        commentId: "0x123" as Hex,
        commentRevision: undefined,
        status: "pending" as ModerationStatus,
        updatedBy: "premoderation",
      });

      expect(result).toBe(mockedComment);
    });

    test("should update latest status if no revision is provided", async () => {
      const mockedComment = {
        id: "0x123" as Hex,
        content: "test comment",
        moderationStatus: "pending" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;
      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce({
        commentId: "0x123" as Hex,
        moderationStatus: "pending" as ModerationStatus,
        updatedAt: new Date(),
        revision: 0,
      } as CommentModerationStatusesSelectType);
      vi.mocked(commentFindFirstMock).mockResolvedValueOnce(mockedComment);
      vi.mocked(dbUpdateExecuteMock).mockResolvedValueOnce([mockedComment]);

      await service.updateStatus({
        commentId: "0x123" as Hex,
        commentRevision: undefined,
        status: "approved" as ModerationStatus,
        updatedBy: "premoderation",
      });

      expect(eventOutboxService.publishEvent).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: "0x123" as Hex,
        moderationStatus: "approved" as ModerationStatus,
        updatedAt: expect.any(Date),
        revision: 0,
        updatedBy: "premoderation",
      });

      expect(dbUpdateMock).toHaveBeenCalledWith(schema.comment);
      expect(dbUpdateSetMock).toHaveBeenCalledWith({
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // we changed to approved so it called update on previous moderation statuses
      expect(dbUpdateMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbUpdateSetMock).toHaveBeenCalledWith({
        moderationStatus: "approved" as ModerationStatus,
        updatedAt: expect.any(Date),
        updatedBy: "premoderation",
      });

      expect(dbUpdateExecuteMock).toHaveBeenCalledTimes(2);
    });

    test("should update specific revision if revision is provided", async () => {
      const mockedComment = {
        id: "0x123" as Hex,
        content: "test comment",
        moderationStatus: "pending" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;
      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce({
        commentId: "0x123" as Hex,
        moderationStatus: "pending" as ModerationStatus,
        updatedAt: new Date(),
        revision: 1,
      } as CommentModerationStatusesSelectType);
      vi.mocked(commentFindFirstMock).mockResolvedValueOnce(mockedComment);
      vi.mocked(dbUpdateExecuteMock).mockResolvedValueOnce([mockedComment]);

      await service.updateStatus({
        commentId: "0x123" as Hex,
        commentRevision: 1,
        status: "approved" as ModerationStatus,
        updatedBy: "premoderation",
      });

      expect(eventOutboxService.publishEvent).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: "0x123" as Hex,
        moderationStatus: "approved" as ModerationStatus,
        updatedAt: expect.any(Date),
        revision: 1,
        updatedBy: "premoderation",
      });

      expect(dbUpdateMock).toHaveBeenCalledWith(schema.comment);
      expect(dbUpdateSetMock).toHaveBeenCalledWith({
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // we changed to approved so it called update on previous moderation statuses
      expect(dbUpdateMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbUpdateSetMock).toHaveBeenCalledWith({
        moderationStatus: "approved" as ModerationStatus,
        updatedAt: expect.any(Date),
        updatedBy: "premoderation",
      });

      expect(dbUpdateExecuteMock).toHaveBeenCalledTimes(2);
    });

    test("should not update previous moderation statuses if status is changing to pending", async () => {
      const mockedComment = {
        id: "0x123" as Hex,
        content: "test comment",
        moderationStatus: "approved" as ModerationStatus,
        moderationStatusChangedAt: new Date(),
      } as CommentSelectType;
      vi.mocked(commentModerationStatusesFindFirstMock).mockResolvedValueOnce({
        commentId: "0x123" as Hex,
        moderationStatus: "approved" as ModerationStatus,
        updatedAt: new Date(),
        revision: 1,
      } as CommentModerationStatusesSelectType);
      vi.mocked(commentFindFirstMock).mockResolvedValueOnce(mockedComment);
      vi.mocked(dbUpdateExecuteMock).mockResolvedValueOnce([mockedComment]);

      await service.updateStatus({
        commentId: "0x123" as Hex,
        commentRevision: 1,
        status: "pending" as ModerationStatus,
        updatedBy: "premoderation",
      });

      expect(dbInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentModerationStatuses,
      );
      expect(dbExecuteInsertMock).toHaveBeenCalledOnce();
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: "0x123" as Hex,
        moderationStatus: "pending" as ModerationStatus,
        updatedAt: expect.any(Date),
        revision: 1,
        updatedBy: "premoderation",
      });

      expect(dbUpdateMock).toHaveBeenCalledWith(schema.comment);
      expect(dbUpdateSetMock).toHaveBeenCalledWith({
        moderationStatus: "pending" as ModerationStatus,
        moderationStatusChangedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(dbUpdateExecuteMock).toHaveBeenCalledTimes(1);
      expect(eventOutboxService.publishEvent).toHaveBeenCalledOnce();
    });
  });
});
