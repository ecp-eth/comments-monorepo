import { describe, test, expect, vi, beforeEach } from "vitest";
import { CommentReferencesCacheService } from "../../src/services/comment-references-cache-service";
import type { Hex } from "@ecp.eth/sdk/core";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { CommentSelectType } from "ponder:schema";
import {
  drizzle,
  type NodePgClient,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { schema } from "../../schema";

const db = drizzle.mock({
  schema,
}) as unknown as NodePgDatabase<typeof schema> & { $client: NodePgClient };

const service = new CommentReferencesCacheService(db);

// Mock the query builder chain for SELECT operations
const mockLimit = vi.fn().mockResolvedValue([]);
const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

vi.spyOn(db, "select").mockImplementation(() => {
  return {
    from: mockFrom,
  } as unknown as ReturnType<typeof db.select>;
});

// Mock insert operations with onConflictDoUpdate
const dbExecuteMock = vi.fn();
const dbOnConflictDoUpdateMock = vi.fn().mockImplementation(() => {
  return {
    execute: dbExecuteMock,
  };
});
const dbInsertValuesMock = vi.fn().mockImplementation(() => {
  return {
    onConflictDoUpdate: dbOnConflictDoUpdateMock,
  };
});
const dbInsertMock = vi.spyOn(db, "insert").mockImplementation(() => {
  return {
    values: dbInsertValuesMock,
  } as unknown as ReturnType<typeof db.insert>;
});

// Mock transaction to return a properly mocked db instance
vi.spyOn(db, "transaction").mockImplementation((callback) => {
  const mockTx = {
    insert: dbInsertMock,
  } as unknown as Parameters<typeof callback>[0];

  return callback(mockTx);
});

describe("CommentReferencesCacheService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getReferenceResolutionResult", () => {
    test("should return cached reference if exists", async () => {
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

      mockLimit.mockResolvedValueOnce([
        {
          references: mockReference,
          referencesResolutionStatus: mockStatus,
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getReferenceResolutionResult({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
      });

      expect(result).toEqual({
        references: mockReference,
        referencesResolutionStatus: mockStatus,
        updatedAt: expect.any(Date),
      });
    });

    test("should return null if no cached reference exists", async () => {
      const mockCommentId = "0x123" as Hex;
      const mockCommentRevision = 0;

      mockLimit.mockResolvedValueOnce([]);

      const result = await service.getReferenceResolutionResult({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
      });

      expect(result).toBeNull();
    });
  });

  describe("updateReferenceResolutionResult", () => {
    test("should insert or update reference resolution result", async () => {
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

      await service.updateReferenceResolutionResult({
        commentId: mockCommentId,
        commentRevision: mockCommentRevision,
        references: mockReference,
        referencesResolutionStatus: mockStatus,
      });

      expect(dbInsertMock).toHaveBeenCalledWith(
        schema.commentReferenceResolutionResults,
      );
      expect(dbInsertValuesMock).toHaveBeenCalledWith({
        commentId: mockCommentId,
        revision: mockCommentRevision,
        references: mockReference,
        referencesResolutionStatus: mockStatus,
      });
      expect(dbOnConflictDoUpdateMock).toHaveBeenCalledWith({
        target: [
          schema.commentReferenceResolutionResults.commentId,
          schema.commentReferenceResolutionResults.revision,
        ],
        set: {
          references: mockReference,
          referencesResolutionStatus: mockStatus,
        },
      });
      expect(dbExecuteMock).toHaveBeenCalledOnce();
    });
  });
});
