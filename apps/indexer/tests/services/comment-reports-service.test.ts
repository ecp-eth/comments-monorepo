import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentReportsService } from "../../src/services/comment-reports-service";
import type {
  ICommentDbService,
  IReportsNotificationsService,
} from "../../src/services/types";
import type { CommentSelectType } from "ponder:schema";
import { ManagementCommentDbService } from "../../src/management/services/comment-db-service";

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

  const mockCommentDbService: ICommentDbService = {
    getCommentById: vi.fn(),
    updateCommentModerationStatus: vi.fn(),
    getCommentPendingModeration: vi.fn(),
  };

  const mockManagementCommentDbService = {
    insertReport: vi.fn(),
  } as unknown as ManagementCommentDbService;

  const mockNotificationService: IReportsNotificationsService = {
    notifyReportCreated: vi.fn(),
    notifyReportStatusChanged: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully report a comment", async () => {
    const service = new CommentReportsService({
      commentDbService: mockCommentDbService,
      managementCommentDbService: mockManagementCommentDbService,
      notificationService: mockNotificationService,
    });

    const mockReport = {
      id: "0x123",
      comment_id: mockComment.id,
      reportee: "0x456" as const,
      message: "test report",
      created_at: new Date(),
      updated_at: new Date(),
      status: "pending" as const,
    };

    vi.mocked(mockCommentDbService.getCommentById).mockResolvedValue(
      mockComment,
    );
    vi.mocked(mockManagementCommentDbService.insertReport).mockResolvedValue(
      mockReport,
    );
    vi.mocked(mockNotificationService.notifyReportCreated).mockResolvedValue(
      void 0,
    );

    await expect(
      service.report("0x123", "0x456", "test report"),
    ).resolves.not.toThrow();

    expect(mockManagementCommentDbService.insertReport).toHaveBeenCalledWith(
      "0x123",
      "0x456",
      "test report",
    );
    expect(mockNotificationService.notifyReportCreated).toHaveBeenCalledWith({
      comment: mockComment,
      report: mockReport,
    });
  });

  it("should throw error when comment does not exist", async () => {
    const service = new CommentReportsService({
      commentDbService: mockCommentDbService,
      managementCommentDbService: mockManagementCommentDbService,
      notificationService: mockNotificationService,
    });

    vi.mocked(mockCommentDbService.getCommentById).mockResolvedValue(undefined);

    await expect(
      service.report("0x123", "0x456", "test report"),
    ).rejects.toThrow("Comment 0x123 not found");

    expect(mockManagementCommentDbService.insertReport).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyReportCreated).not.toHaveBeenCalled();
  });

  it("should handle report without message", async () => {
    const service = new CommentReportsService({
      commentDbService: mockCommentDbService,
      managementCommentDbService: mockManagementCommentDbService,
      notificationService: mockNotificationService,
    });

    const mockReport = {
      id: "0x123",
      comment_id: mockComment.id,
      reportee: "0x456" as const,
      message: "",
      created_at: new Date(),
      updated_at: new Date(),
      status: "pending" as const,
    };

    vi.mocked(mockCommentDbService.getCommentById).mockResolvedValue(
      mockComment,
    );
    vi.mocked(mockManagementCommentDbService.insertReport).mockResolvedValue(
      mockReport,
    );
    vi.mocked(mockNotificationService.notifyReportCreated).mockResolvedValue(
      void 0,
    );

    await expect(service.report("0x123", "0x456", "")).resolves.not.toThrow();

    expect(mockManagementCommentDbService.insertReport).toHaveBeenCalledWith(
      "0x123",
      "0x456",
      "",
    );
    expect(mockNotificationService.notifyReportCreated).toHaveBeenCalledWith({
      comment: mockComment,
      report: mockReport,
    });
  });
});
