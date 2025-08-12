import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/node";

// Mock Sentry to avoid real reporting
vi.mock("@sentry/node", () => ({
  captureMessage: vi.fn(),
}));

// Minimal stub for ponder schema used by the SUT
vi.mock("ponder:schema", () => ({
  default: {
    comment: {},
  },
}));

// Mocks for services used by the SUT
const saveAndNotifyMock = vi.fn().mockResolvedValue(undefined);
const moderateMock = vi.fn().mockResolvedValue({
  result: {
    status: "approved",
    changedAt: new Date("2024-01-01T00:00:00Z"),
    classifier: { labels: [], score: 0.5 },
  },
  saveAndNotify: saveAndNotifyMock,
});
const moderateUpdateMock = vi.fn().mockResolvedValue({
  result: {
    status: "pending",
    changedAt: new Date("2024-01-02T00:00:00Z"),
    classifier: { labels: ["spam"], score: 0.9 },
  },
  saveAndNotify: saveAndNotifyMock,
});
const getMutedAccountMock = vi.fn().mockResolvedValue(false);

vi.mock("../../src/services", () => ({
  commentModerationService: {
    moderate: moderateMock,
    moderateUpdate: moderateUpdateMock,
  },
  mutedAccountsManagementService: {
    getMutedAccount: getMutedAccountMock,
  },
}));

// Mock 0x swap resolver
const resolveFromCommentAddedEventMock = vi.fn().mockResolvedValue(null);
vi.mock("../../src/lib/0x-swap-resolver", () => ({
  zeroExSwapResolver: {
    resolveFromCommentAddedEvent: resolveFromCommentAddedEventMock,
  },
}));

// Mock reference resolver
const resolveCommentReferencesMock = vi.fn().mockResolvedValue({
  status: "success",
  references: [],
});
vi.mock("../../src/lib/resolve-comment-references", () => ({
  resolveCommentReferences: resolveCommentReferencesMock,
}));

// Mock env with mutable object so tests can tweak limits
const envMock = {
  COMMENT_CONTENT_LENGTH_LIMIT: 10_000,
};
vi.mock("../../src/env", () => ({
  env: envMock,
  SUPPORTED_CHAIN_IDS: [1],
}));

// Helper: in-memory DB emulating the tiny subset used by the SUT
type HookMetadataEntry = { key: string; value: string };
type CommentRow = {
  id: string;
  content?: string;
  metadata?: unknown[];
  hookMetadata?: HookMetadataEntry[];
  targetUri?: string;
  parentId?: string | null;
  rootCommentId?: string | null;
  author?: string;
  txHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
  chainId?: number;
  app?: string;
  logIndex?: number;
  channelId?: bigint | number;
  commentType?: number;
  moderationStatus?: string;
  moderationStatusChangedAt?: Date;
  moderationClassifierResult?: unknown;
  moderationClassifierScore?: number;
  zeroExSwap?: unknown;
  references?: unknown[];
  referencesResolutionStatus?: string;
  referencesResolutionStatusChangedAt?: Date;
  reactionCounts?: Record<string, number>;
  revision?: number;
  deletedAt?: Date;
  [key: string]: unknown;
};

class FakeDb {
  private comments = new Map<string, CommentRow>();

  async find(
    _table: unknown,
    where: { id: string },
  ): Promise<CommentRow | undefined> {
    return this.comments.get(where.id);
  }

  insert(_table: unknown) {
    void _table;
    return {
      values: async (
        row: Partial<CommentRow> & { id: string },
      ): Promise<CommentRow> => {
        const next: CommentRow = {
          revision: row.revision ?? 0,
          hookMetadata: Array.isArray(row.hookMetadata) ? row.hookMetadata : [],
          reactionCounts: row.reactionCounts ?? {},
          ...row,
        } as CommentRow;
        this.comments.set(row.id, next);
        return next;
      },
    } as const;
  }

  update(_table: unknown, where: { id: string }) {
    void _table;
    return {
      set: async (partial: Partial<CommentRow>): Promise<CommentRow> => {
        const current: CommentRow =
          this.comments.get(where.id) ?? ({ id: where.id } as CommentRow);
        const updated: CommentRow = { ...current, ...partial };
        this.comments.set(where.id, updated);
        return updated;
      },
    } as const;
  }

  getRow(id: string): CommentRow | undefined {
    return this.comments.get(id);
  }
}

// Fake ponder to capture handlers
type HandlerArgs = { event: unknown; context: unknown };

function createPonderHarness() {
  const handlers = new Map<string, (args: HandlerArgs) => Promise<void>>();
  const on = (event: string, cb: (args: HandlerArgs) => Promise<void>) => {
    handlers.set(event, cb);
  };
  return { on, handlers } as const;
}

// Utilities to build common event/context fixtures
function buildBaseEventArgs(overrides?: Record<string, unknown>) {
  return {
    commentId: "0x01",
    content: "hello world",
    metadata: [],
    targetUri: "https://example.com/page?x=1#frag",
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    author: "0x000000000000000000000000000000000000dEaD",
    app: "test-app",
    channelId: 1n,
    commentType: 0,
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    updatedAt: BigInt(Math.floor(Date.now() / 1000)),
    editedByApp: "test-app",
    ...(overrides ?? {}),
  };
}

function buildEvent(args: Record<string, unknown>) {
  return {
    args,
    transaction: { hash: "0xabc" },
    log: { logIndex: 7 },
    block: { timestamp: BigInt(1_700_000_000) },
  } as const;
}

function buildContext(db: FakeDb) {
  return {
    db,
    chain: { id: 1 },
  } as const;
}

async function setupHandlers() {
  const harness = createPonderHarness();
  const { initializeCommentEventsIndexing } = await import(
    "../../src/indexing/comments"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializeCommentEventsIndexing({ on: harness.on } as any);

  return harness.handlers;
}

describe("initializeCommentEventsIndexing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.COMMENT_CONTENT_LENGTH_LIMIT = 10_000; // reset limit
  });

  describe("CommentsV1:CommentAdded", () => {
    it("skips when content length exceeds limit", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      envMock.COMMENT_CONTENT_LENGTH_LIMIT = 5;
      const args = buildBaseEventArgs({ content: "0123456789" }); // length 10
      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      expect(db.getRow(args.commentId)).toBeUndefined();
      expect(Sentry.captureMessage).toHaveBeenCalledOnce();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("Comment content length limit exceeded"),
        expect.any(Object),
      );
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });

    it("skips when author is muted", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      getMutedAccountMock.mockResolvedValueOnce(true);
      const args = buildBaseEventArgs();
      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      expect(db.getRow(args.commentId)).toBeUndefined();
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });

    it("inserts and sets computed fields (no parent)", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      const args = buildBaseEventArgs({ content: "hello", metadata: ["m1"] });

      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      const row = db.getRow(args.commentId);

      expect(row).toMatchObject({
        app: "test-app",
        author: "0x000000000000000000000000000000000000dEaD",
        channelId: 1n,
        commentType: 0,
        content: "hello",
        createdAt: expect.any(Date),
        metadata: ["m1"],
        hookMetadata: [],
        parentId: null,
        rootCommentId: null,
        targetUri: "https://example.com/page?x=1",
        chainId: 1,
        txHash: "0xabc",
        logIndex: 7,
        moderationStatus: "approved",
        moderationClassifierResult: [],
        moderationClassifierScore: 0.5,
        referencesResolutionStatus: "success",
        referencesResolutionStatusChangedAt: expect.any(Date),
        zeroExSwap: null,
        references: [],
        revision: 0,
        updatedAt: expect.any(Date),
      });
      expect(saveAndNotifyMock).toHaveBeenCalled();
    });

    it("skips when parent not found and parentId provided", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      const args = buildBaseEventArgs({
        parentId:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
      });

      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      expect(db.getRow(args.commentId)).toBeUndefined();
      expect(Sentry.captureMessage).toHaveBeenCalledOnce();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("Parent comment not found"),
        expect.any(Object),
      );
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });

    it("increments parent reactionCounts when adding a reaction", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      // Seed a parent comment
      const parentId = "0xparent";
      await db.insert({}).values({
        id: parentId,
        content: "parent",
        reactionCounts: {},
        rootCommentId: null,
      });

      // Reaction type comes from event.args.content
      const args = buildBaseEventArgs({
        commentId: "0xchild",
        parentId,
        commentType: 1, // COMMENT_TYPE_REACTION
        content: "like",
      });

      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      const parent = db.getRow(parentId)!;
      expect(parent.reactionCounts && parent.reactionCounts.like).toBe(1);

      expect(saveAndNotifyMock).toHaveBeenCalledOnce();
    });
  });

  describe("CommentsV1:CommentHookMetadataSet", () => {
    it("adds and updates hook metadata entries", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      // Seed a comment
      await db.insert({}).values({ id: "0x01", content: "hi" });

      const handler = handlers.get("CommentsV1:CommentHookMetadataSet")!;

      await handler({
        event: buildEvent({ commentId: "0x01", key: "a", value: "1" }),
        context,
      });
      expect(db.getRow("0x01")!.hookMetadata).toEqual([
        { key: "a", value: "1" },
      ]);

      await handler({
        event: buildEvent({ commentId: "0x01", key: "a", value: "2" }),
        context,
      });
      expect(db.getRow("0x01")!.hookMetadata).toEqual([
        { key: "a", value: "2" },
      ]);
    });
  });

  describe("CommentsV1:CommentDeleted", () => {
    it("sets deletedAt if author matches and decrements parent reaction count", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      // Parent comment with one like
      const parentId = "0xparent";
      await db.insert({}).values({
        id: parentId,
        content: "parent",
        reactionCounts: { like: 1 },
      });

      // Reaction comment
      await db.insert({}).values({
        id: "0xchild",
        content: "like",
        commentType: 1, // COMMENT_TYPE_REACTION
        parentId,
        author: "0x000000000000000000000000000000000000dEaD",
      });

      const deleteHandler = handlers.get("CommentsV1:CommentDeleted")!;

      // Author matches: deletedAt set and parent decremented
      await deleteHandler({
        event: buildEvent({
          commentId: "0xchild",
          author: "0x000000000000000000000000000000000000dEaD",
        }),
        context,
      });
      expect(db.getRow("0xchild")!.deletedAt).toBeInstanceOf(Date);
      expect(
        db.getRow(parentId)!.reactionCounts &&
          db.getRow(parentId)!.reactionCounts!.like,
      ).toBe(0);

      // Non-matching author: no change
      await db.insert({}).values({
        id: "0xchild2",
        content: "like",
        commentType: 1,
        parentId,
        author: "0x0000000000000000000000000000000000000001",
      });
      await deleteHandler({
        event: buildEvent({
          commentId: "0xchild2",
          author: "0x0000000000000000000000000000000000000002",
        }),
        context,
      });
      expect(db.getRow("0xchild2")!.deletedAt).toBeUndefined();
    });
  });

  describe("CommentsV1:CommentEdited", () => {
    it("updates when comment exists and author not muted", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      // Seed original comment with default revision 0
      await db.insert({}).values({
        id: "0x01",
        content: "original",
        author: "0x000000000000000000000000000000000000dEaD",
        revision: 0,
        moderationStatus: "approved",
        moderationStatusChangedAt: new Date("2024-01-01T00:00:00Z"),
      });

      const newContent = "updated content";
      const updatedAt = BigInt(1_700_000_123);
      await handlers.get("CommentsV1:CommentEdited")!({
        event: buildEvent({
          commentId: "0x01",
          content: newContent,
          updatedAt,
          author: "0x000000000000000000000000000000000000dEaD",
          editedByApp: "test-app",
        }),
        context,
      });

      const row = db.getRow("0x01");

      expect(row).toMatchObject({
        content: newContent,
        revision: 1,
        updatedAt: expect.any(Date),
        moderationStatus: "pending",
        moderationClassifierResult: ["spam"],
        moderationClassifierScore: 0.9,
      });
      expect(saveAndNotifyMock).toHaveBeenCalled();
    });

    it("skips if comment does not exist", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      await handlers.get("CommentsV1:CommentEdited")!({
        event: buildEvent({
          commentId: "0x01",
          content: "updated",
          updatedAt: BigInt(1_700_000_123),
          author: "0x000000000000000000000000000000000000dEaD",
          editedByApp: "test-app",
        }),
        context,
      });

      expect(Sentry.captureMessage).toHaveBeenCalledOnce();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("Comment not found while editing commentId"),
        expect.any(Object),
      );
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });

    it("skips when author is muted", async () => {
      const handlers = await setupHandlers();

      const db = new FakeDb();
      const context = buildContext(db);

      // Seed a comment
      await db.insert({}).values({ id: "0x01", content: "original" });

      getMutedAccountMock.mockResolvedValueOnce(true);

      await handlers.get("CommentsV1:CommentEdited")!({
        event: buildEvent({
          commentId: "0x01",
          content: "updated",
          updatedAt: BigInt(1_700_000_123),
          author: "0x000000000000000000000000000000000000dEaD",
          editedByApp: "test-app",
        }),
        context,
      });

      expect(db.getRow("0x01")!.content).toBe("original");
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });
  });
});
