import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/node";
import { initializeCommentEventsIndexing } from "../../src/indexing/comments";
import { Event } from "ponder:registry";

// Mock Sentry to avoid real reporting
vi.mock("@sentry/node", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

// Minimal stub for ponder schema used by the SUT
vi.mock("ponder:schema", () => ({
  default: {
    comment: {},
  },
}));

vi.mock("../../src/events/comment/index.ts", () => ({
  ponderEventToCommentAddedEvent: vi.fn(),
  ponderEventToCommentHookMetadataSetEvent: vi.fn(),
  ponderEventToCommentDeletedEvent: vi.fn(),
  ponderEventToCommentEditedEvent: vi.fn(),
  createCommentReactionsUpdatedEvent: vi.fn(),
}));

const {
  ponderEventToCommentAddedEvent,
  ponderEventToCommentHookMetadataSetEvent,
  ponderEventToCommentDeletedEvent,
  ponderEventToCommentEditedEvent,
  createCommentReactionsUpdatedEvent,
} = await vi.importMock<typeof import("../../src/events/comment/index.ts")>(
  "../../src/events/comment/index.ts",
);

const saveAndNotifyMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../src/services/index.ts", async () => {
  const services = await vi.importActual<
    typeof import("../../src/services/index.ts")
  >("../../src/services/index.ts");

  return {
    ...services,
    commentModerationService: {
      moderate: vi.spyOn(services.commentModerationService, "moderate"),
      moderateUpdate: vi.spyOn(
        services.commentModerationService,
        "moderateUpdate",
      ),
    },
    mutedAccountsManagementService: {
      getMutedAccount: vi.spyOn(
        services.mutedAccountsManagementService,
        "getMutedAccount",
      ),
    },
    commentReferencesCacheService: {
      getReferenceResolutionResult: vi.spyOn(
        services.commentReferencesCacheService,
        "getReferenceResolutionResult",
      ),
      updateReferenceResolutionResult: vi.spyOn(
        services.commentReferencesCacheService,
        "updateReferenceResolutionResult",
      ),
    },
    db: {
      transaction: vi.spyOn(services.db, "transaction"),
      insert: vi.spyOn(services.db, "insert"),
      update: vi.spyOn(services.db, "update"),
      query: {
        comment: vi.spyOn(services.db.query.comment, "findFirst"),
      },
    },
    eventOutboxService: {
      publishEvent: vi.spyOn(services.eventOutboxService, "publishEvent"),
    },
  };
});

const servicesMock = await vi.importMock<
  typeof import("../../src/services/index.ts")
>("../../src/services/index.ts");

vi.mock("../../src/lib/0x-swap-resolver", () => ({
  zeroExSwapResolver: {
    resolveFromCommentAddedEvent: vi.fn(),
  },
}));
const { zeroExSwapResolver } = await vi.importMock<
  typeof import("../../src/lib/0x-swap-resolver")
>("../../src/lib/0x-swap-resolver");
zeroExSwapResolver.resolveFromCommentAddedEvent.mockResolvedValue(null);

vi.mock("../../src/lib/resolve-comment-references", () => ({
  resolveCommentReferences: vi.fn(),
}));
const { resolveCommentReferences } = await vi.importMock<
  typeof import("../../src/lib/resolve-comment-references")
>("../../src/lib/resolve-comment-references");

resolveCommentReferences.mockResolvedValue({
  status: "success",
  references: [],
});

// Fake ponder to capture handlers
type HandlerArgs = { event: unknown; context: unknown };

function createPonderHarness() {
  const handlers = new Map<string, (args: HandlerArgs) => Promise<void>>();
  const on = (event: string, cb: (args: HandlerArgs) => Promise<void>) => {
    handlers.set(event, cb);
  };
  return { on, handlers } as const;
}

function buildCommentAddedEventArgs(
  overrides?: Partial<Event<"CommentsV1:CommentAdded">["args"]>,
): Event<"CommentsV1:CommentAdded">["args"] {
  return {
    commentId: "0x01",
    content: "hello world",
    metadata: [],
    targetUri: "https://example.com/page?x=1#frag",
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    author: "0x000000000000000000000000000000000000dEaD",
    app: "0x0000000000000000000000000000000000000000",
    channelId: 1n,
    commentType: 0,
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    authMethod: 0,
    ...(overrides ?? {}),
  };
}

function buildCommentHookMetadataSetEventArgs(
  overrides?: Partial<Event<"CommentsV1:CommentHookMetadataSet">["args"]>,
): Event<"CommentsV1:CommentHookMetadataSet">["args"] {
  return {
    commentId: "0x01",
    key: "0x01",
    value: "0x01",
    ...(overrides ?? {}),
  };
}

function buildCommentDeletedEventArgs(
  overrides?: Partial<Event<"CommentsV1:CommentDeleted">["args"]>,
): Event<"CommentsV1:CommentDeleted">["args"] {
  return {
    commentId: "0x01",
    author: "0x000000000000000000000000000000000000dEaD",
    ...(overrides ?? {}),
  };
}

function buildCommentEditedEventArgs(
  overrides?: Partial<Event<"CommentsV1:CommentEdited">["args"]>,
): Event<"CommentsV1:CommentEdited">["args"] {
  return {
    commentId: "0x01",
    authMethod: 0,
    channelId: 1n,
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    updatedAt: BigInt(Math.floor(Date.now() / 1000)),
    content: "hello world",
    targetUri: "https://example.com/page?x=1#frag",
    commentType: 0,
    author: "0x000000000000000000000000000000000000dEaD",
    editedByApp: "0x0000000000000000000000000000000000000000",
    metadata: [],
    ...overrides,
  };
}

function buildEvent(
  args:
    | Event<"CommentsV1:CommentAdded">["args"]
    | Event<"CommentsV1:CommentHookMetadataSet">["args"]
    | Event<"CommentsV1:CommentDeleted">["args"],
) {
  return {
    args,
    transaction: { hash: "0xabc" },
    log: { logIndex: 7 },
    block: { timestamp: BigInt(1_700_000_000), number: 1n },
  } as const;
}

function buildContext() {
  return {
    chain: { id: 1 },
  } as const;
}

const harness = createPonderHarness();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
initializeCommentEventsIndexing({ on: harness.on } as any);
const handlers = harness.handlers;

describe("initializeCommentEventsIndexing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CommentsV1:CommentAdded", () => {
    it("skips when content length exceeds limit", async () => {
      const context = buildContext();

      const args = buildCommentAddedEventArgs({ content: "a".repeat(11000) });
      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      expect(Sentry.captureMessage).toHaveBeenCalledOnce();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("Comment content length limit exceeded"),
        expect.any(Object),
      );
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });

    it("skips when author is muted", async () => {
      const context = buildContext();

      servicesMock.mutedAccountsManagementService.getMutedAccount.mockResolvedValueOnce(
        {
          account: "0x0000000000000000000000000000000000000000" as const,
          createdAt: new Date(),
          reason: null,
        },
      );

      const args = buildCommentAddedEventArgs();
      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });
    });

    it("inserts and sets computed fields (no parent)", async () => {
      const context = buildContext();
      const args = buildCommentAddedEventArgs({
        content: "hello",
      });

      servicesMock.mutedAccountsManagementService.getMutedAccount.mockResolvedValueOnce(
        undefined,
      );

      resolveCommentReferences.mockResolvedValueOnce({
        status: "success",
        references: [],
      });

      servicesMock.commentModerationService.moderate.mockResolvedValueOnce({
        result: {
          status: "approved",
          changedAt: new Date("2024-01-01T00:00:00Z"),
          classifier: { labels: {}, score: 0.5 },
        },
        saveAndNotify: saveAndNotifyMock,
      });

      servicesMock.eventOutboxService.publishEvent.mockResolvedValueOnce(
        undefined,
      );

      servicesMock.commentReferencesCacheService.getReferenceResolutionResult.mockResolvedValueOnce(
        null,
      );

      servicesMock.commentReferencesCacheService.updateReferenceResolutionResult.mockResolvedValueOnce(
        undefined,
      );

      // @ts-expect-error -- mock
      servicesMock.db.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockReturnValueOnce({
            execute: vi.fn().mockResolvedValueOnce([{}]),
          }),
        }),
      });

      servicesMock.db.transaction.mockImplementation((cb) => {
        return cb(servicesMock.db as any);
      });

      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      expect(servicesMock.db.insert).toHaveBeenCalledOnce();
      expect(
        servicesMock.eventOutboxService.publishEvent,
      ).toHaveBeenCalledOnce();
      expect(saveAndNotifyMock).toHaveBeenCalledOnce();

      // should update the reference resolution result bcz getReferenceResolutionResult is null
      expect(
        servicesMock.commentReferencesCacheService
          .updateReferenceResolutionResult,
      ).toHaveBeenCalledOnce();
    });

    it("skips when parent not found and parentId provided", async () => {
      const context = buildContext();
      const args = buildCommentAddedEventArgs({
        parentId:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
      });

      servicesMock.mutedAccountsManagementService.getMutedAccount.mockResolvedValueOnce(
        undefined,
      );

      servicesMock.db.query.comment.findFirst.mockResolvedValueOnce(undefined);

      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      expect(servicesMock.db.insert).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledOnce();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("Parent comment not found"),
        expect.any(Object),
      );
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });

    it("increments parent reactionCounts when adding a reaction", async () => {
      const context = buildContext();

      servicesMock.commentModerationService.moderate.mockResolvedValueOnce({
        result: {
          status: "approved",
          changedAt: new Date("2024-01-01T00:00:00Z"),
          classifier: { labels: {}, score: 0.5 },
        },
        saveAndNotify: saveAndNotifyMock,
      });

      servicesMock.mutedAccountsManagementService.getMutedAccount.mockResolvedValueOnce(
        undefined,
      );

      servicesMock.commentReferencesCacheService.getReferenceResolutionResult.mockResolvedValueOnce(
        null,
      );

      servicesMock.commentReferencesCacheService.updateReferenceResolutionResult.mockResolvedValueOnce(
        undefined,
      );

      servicesMock.db.query.comment.findFirst.mockResolvedValueOnce({
        id: "0xparent",
        content: "parent",
        reactionCounts: {},
        rootCommentId: null,
      } as any);

      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValueOnce([{}]),
        }),
      });

      // @ts-expect-error -- mock
      servicesMock.db.update.mockReturnValueOnce({
        set: setMock,
      });

      // @ts-expect-error -- mock
      servicesMock.db.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockReturnValueOnce({
            execute: vi.fn().mockResolvedValueOnce([{}]),
          }),
        }),
      });

      ponderEventToCommentAddedEvent.mockReturnValueOnce({} as any);

      servicesMock.eventOutboxService.publishEvent.mockResolvedValueOnce(
        undefined,
      );

      // Reaction type comes from event.args.content
      const args = buildCommentAddedEventArgs({
        commentId: "0xchild",
        parentId: "0xparent",
        commentType: 1, // COMMENT_TYPE_REACTION
        content: "like",
      });

      await handlers.get("CommentsV1:CommentAdded")!({
        event: buildEvent(args),
        context,
      });

      expect(setMock).toHaveBeenCalledWith({
        reactionCounts: {
          like: 1,
        },
      });

      expect(saveAndNotifyMock).toHaveBeenCalledOnce();
    });
  });

  describe("CommentsV1:CommentHookMetadataSet", () => {
    it("adds and updates hook metadata entries", async () => {
      const context = buildContext();

      servicesMock.db.transaction.mockImplementation((cb) => {
        return cb(servicesMock.db as any);
      });

      servicesMock.db.query.comment.findFirst.mockResolvedValue({
        id: "0x01",
        hookMetadata: [],
      } as any);

      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValueOnce([{}]),
        }),
      });

      // @ts-expect-error -- mock
      servicesMock.db.update.mockReturnValue({
        set: setMock,
      });

      servicesMock.eventOutboxService.publishEvent.mockResolvedValue(undefined);

      ponderEventToCommentHookMetadataSetEvent.mockReturnValueOnce({} as any);

      const handler = handlers.get("CommentsV1:CommentHookMetadataSet")!;

      await handler({
        event: buildEvent(
          buildCommentHookMetadataSetEventArgs({ key: "0x01", value: "0x01" }),
        ),
        context,
      });

      expect(setMock).toHaveBeenCalledWith({
        hookMetadata: [{ key: "0x01", value: "0x01" }],
        updatedAt: expect.any(Date),
      });

      await handler({
        event: buildEvent(
          buildCommentHookMetadataSetEventArgs({ key: "0x01", value: "0x02" }),
        ),
        context,
      });
      expect(setMock).toHaveBeenCalledWith({
        hookMetadata: [{ key: "0x01", value: "0x02" }],
        updatedAt: expect.any(Date),
      });

      expect(
        servicesMock.eventOutboxService.publishEvent,
      ).toHaveBeenCalledTimes(2);
      expect(ponderEventToCommentHookMetadataSetEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe("CommentsV1:CommentDeleted", () => {
    it("sets deletedAt if author matches and decrements parent reaction count", async () => {
      const context = buildContext();

      servicesMock.db.transaction.mockImplementation((cb) => {
        return cb(servicesMock.db as any);
      });

      // Parent comment with one like
      servicesMock.db.query.comment.findFirst
        .mockResolvedValueOnce({
          id: "0xchild",
          content: "like",
          commentType: 1, // COMMENT_TYPE_REACTION
          parentId: "0xparent",
          author: "0x000000000000000000000000000000000000dEaD",
        } as any)
        .mockResolvedValueOnce({
          id: "0xparent",
          content: "parent",
          reactionCounts: { like: 1 },
        } as any);

      const returningExecuteMock = vi.fn().mockResolvedValueOnce([
        {
          id: "0xparent",
          content: "parent",
          reactionCounts: { like: 0 },
        } as any,
      ]);
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({ execute: returningExecuteMock }),
          execute: vi.fn().mockResolvedValueOnce([{}]),
        }),
      });

      // @ts-expect-error -- mock
      servicesMock.db.update.mockReturnValue({
        set: setMock,
      });

      servicesMock.eventOutboxService.publishEvent.mockResolvedValue(undefined);

      ponderEventToCommentDeletedEvent.mockReturnValueOnce({} as any);
      createCommentReactionsUpdatedEvent.mockReturnValueOnce({} as any);

      const deleteHandler = handlers.get("CommentsV1:CommentDeleted")!;

      // Author matches: deletedAt set and parent decremented
      await deleteHandler({
        event: buildEvent(
          buildCommentDeletedEventArgs({
            commentId: "0xchild",
            author: "0x000000000000000000000000000000000000dEaD",
          }),
        ),
        context,
      });

      expect(setMock).toHaveBeenCalledWith({
        updatedAt: expect.any(Date),
        deletedAt: expect.any(Date),
      });
      expect(setMock).toHaveBeenCalledWith({
        reactionCounts: {
          like: 0,
        },
        updatedAt: expect.any(Date),
      });
      expect(
        servicesMock.eventOutboxService.publishEvent,
      ).toHaveBeenCalledTimes(2);
      expect(ponderEventToCommentDeletedEvent).toHaveBeenCalledOnce();
      expect(createCommentReactionsUpdatedEvent).toHaveBeenCalledWith({
        comment: expect.objectContaining({
          id: "0xparent",
          reactionCounts: { like: 0 },
        }),
      });
    });
  });

  describe("CommentsV1:CommentEdited", () => {
    it("updates when comment exists and author not muted", async () => {
      const context = buildContext();

      servicesMock.mutedAccountsManagementService.getMutedAccount.mockResolvedValueOnce(
        undefined,
      );

      servicesMock.commentModerationService.moderateUpdate.mockResolvedValueOnce(
        {
          result: {
            status: "pending",
            changedAt: new Date("2024-01-01T00:00:00Z"),
            classifier: { labels: { spam: 0.9 }, score: 0.9 },
          },
          saveAndNotify: saveAndNotifyMock,
        },
      );

      servicesMock.commentReferencesCacheService.getReferenceResolutionResult.mockResolvedValueOnce(
        null,
      );
      servicesMock.commentReferencesCacheService.updateReferenceResolutionResult.mockResolvedValueOnce(
        undefined,
      );

      servicesMock.db.transaction.mockImplementation((cb) => {
        return cb(servicesMock.db as any);
      });

      servicesMock.db.query.comment.findFirst.mockResolvedValueOnce({
        id: "0x01",
        content: "original",
        revision: 0,
      } as any);

      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValueOnce([{}]),
        }),
      });

      // @ts-expect-error -- mock
      servicesMock.db.update.mockReturnValue({
        set: setMock,
      });

      servicesMock.eventOutboxService.publishEvent.mockResolvedValue(undefined);

      ponderEventToCommentEditedEvent.mockReturnValueOnce({} as any);

      const newContent = "updated content";
      const updatedAt = BigInt(1_700_000_123);
      await handlers.get("CommentsV1:CommentEdited")!({
        event: buildEvent(
          buildCommentEditedEventArgs({
            commentId: "0x01",
            content: newContent,
            updatedAt,
            author: "0x000000000000000000000000000000000000dEaD",
            editedByApp: "0x0000000000000000000000000000000000000000",
          }),
        ),
        context,
      });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          content: newContent,
          revision: 1,
          updatedAt: expect.any(Date),
          moderationStatus: "pending",
          moderationClassifierResult: { spam: 0.9 },
          moderationClassifierScore: 0.9,
          moderationStatusChangedAt: expect.any(Date),
          references: [],
          referencesResolutionStatus: "success",
        }),
      );

      expect(
        servicesMock.eventOutboxService.publishEvent,
      ).toHaveBeenCalledOnce();
      expect(saveAndNotifyMock).toHaveBeenCalled();
    });

    it("skips if comment does not exist", async () => {
      const context = buildContext();

      servicesMock.mutedAccountsManagementService.getMutedAccount.mockResolvedValueOnce(
        undefined,
      );

      servicesMock.db.transaction.mockImplementation((cb) => {
        return cb(servicesMock.db as any);
      });

      servicesMock.db.query.comment.findFirst.mockResolvedValueOnce(undefined);

      await handlers.get("CommentsV1:CommentEdited")!({
        event: buildEvent(
          buildCommentEditedEventArgs({
            commentId: "0x01",
            content: "updated",
            updatedAt: BigInt(1_700_000_123),
            author: "0x000000000000000000000000000000000000dEaD",
            editedByApp: "0x0000000000000000000000000000000000000000",
          }),
        ),
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
      const context = buildContext();

      servicesMock.mutedAccountsManagementService.getMutedAccount.mockResolvedValueOnce(
        {
          account: "0x0000000000000000000000000000000000000000" as const,
          createdAt: new Date(),
          reason: null,
        },
      );

      await handlers.get("CommentsV1:CommentEdited")!({
        event: buildEvent(
          buildCommentEditedEventArgs({
            commentId: "0x01",
            content: "updated",
            updatedAt: BigInt(1_700_000_123),
            author: "0x000000000000000000000000000000000000dEaD",
            editedByApp: "0x0000000000000000000000000000000000000000",
          }),
        ),
        context,
      });

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(saveAndNotifyMock).not.toHaveBeenCalled();
    });
  });
});
