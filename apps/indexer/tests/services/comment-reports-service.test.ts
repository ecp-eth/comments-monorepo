import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentReportsService } from "../../src/services/comment-reports-service";
import type { IReportsNotificationsService } from "../../src/services/types";
import type { CommentSelectType } from "ponder:schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "../../schema";

describe("CommentReportsService", () => {
  const mockComment: CommentSelectType = {
    id: "0x123",
    author: "0x456",
    content: "test comment",
    targetUri: "test://uri",
    app: "0x789",
    chainId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    moderationStatus: "approved",
    moderationStatusChangedAt: new Date(),
    moderationClassifierResult: {},
    moderationClassifierScore: 0,
    parentId: null,
    commentType: 0,
    channelId: BigInt(1),
    metadata: null,
    hookMetadata: null,
    rootCommentId: null,
    deletedAt: null,
    txHash: "0x123",
    logIndex: 0,
    revision: 0,
    zeroExSwap: null,
    references: [],
    referencesResolutionStatus: "pending",
    referencesResolutionStatusChangedAt: null,
    reactionCounts: {},
  };

  const mockNotificationService: IReportsNotificationsService = {
    notifyReportCreated: vi.fn(),
    notifyReportStatusChanged: vi.fn(),
  };

  const db = drizzle.mock({
    schema,
  });

  const commentFindFirstMock = vi.spyOn(db.query.comment, "findFirst");
  const dbExecuteMock = vi.fn();
  const dbReturningMock = vi.fn().mockImplementation(() => {
    return {
      execute: dbExecuteMock,
    };
  });
  const dbInsertValuesMock = vi.fn().mockImplementation(() => {
    return {
      returning: dbReturningMock,
    };
  });
  const dbInsertMock = vi.spyOn(db, "insert").mockImplementation(() => {
    return {
      values: dbInsertValuesMock,
    } as any;
  });
  vi.spyOn(db, "transaction").mockImplementation((callback) => {
    return callback(db as any);
  });

  const service = new CommentReportsService({
    db,
    notificationService: mockNotificationService,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully report a comment", async () => {
    const mockReport = {
      id: "0x123",
      commentId: mockComment.id,
      reportee: "0x456" as const,
      message: "test report",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "pending" as const,
    };

    vi.mocked(commentFindFirstMock).mockResolvedValue(mockComment);
    vi.mocked(dbExecuteMock).mockResolvedValueOnce([mockReport]);
    vi.mocked(mockNotificationService.notifyReportCreated).mockResolvedValue(
      void 0,
    );

    await expect(
      service.report({
        commentId: "0x123",
        reportee: "0x456",
        message: "test report",
      }),
    ).resolves.not.toThrow();

    expect(dbInsertMock).toHaveBeenCalledWith(schema.commentReports);
    expect(dbInsertValuesMock).toHaveBeenCalledWith({
      commentId: mockComment.id,
      reportee: "0x456",
      message: "test report",
      status: "pending",
    });
    expect(mockNotificationService.notifyReportCreated).toHaveBeenCalledWith({
      comment: mockComment,
      report: mockReport,
    });
  });

  it("should throw error when comment does not exist", async () => {
    vi.mocked(commentFindFirstMock).mockResolvedValue(undefined);

    await expect(
      service.report({
        commentId: "0x123",
        reportee: "0x456",
        message: "test report",
      }),
    ).rejects.toThrow("Comment 0x123 not found");

    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyReportCreated).not.toHaveBeenCalled();
  });

  it("should handle report without message", async () => {
    const mockReport = {
      id: "0x123",
      commentId: mockComment.id,
      reportee: "0x456" as const,
      message: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "pending" as const,
    };

    vi.mocked(commentFindFirstMock).mockResolvedValue(mockComment);
    vi.mocked(dbExecuteMock).mockResolvedValueOnce([mockReport]);
    vi.mocked(mockNotificationService.notifyReportCreated).mockResolvedValue(
      void 0,
    );

    await expect(
      service.report({
        commentId: "0x123",
        reportee: "0x456",
        message: "",
      }),
    ).resolves.not.toThrow();

    expect(dbInsertMock).toHaveBeenCalledWith(schema.commentReports);
    expect(mockNotificationService.notifyReportCreated).toHaveBeenCalledWith({
      comment: mockComment,
      report: mockReport,
    });
  });
});
