import type { Hex } from "@ecp.eth/sdk/core/schemas";
import type { Event } from "ponder:registry";
import type { CommentSelectType } from "ponder:schema";
import type {
  ICommentModerationClassifierService,
  ICommentPremoderationService,
  IModerationNotificationsService,
  TelegramCallbackQuery,
} from "../../services/types";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { CommentModerationClassfierResult } from "../../services/types";
import { CommentNotFoundError } from "../../services/errors";

type ModerationStatus = "pending" | "approved" | "rejected";

interface CommentModerationServiceOptions {
  knownReactions: Set<string>;
  notificationService: IModerationNotificationsService;
  premoderationService: ICommentPremoderationService;
  classifierService: ICommentModerationClassifierService;
}

export interface ModerationStatusResult {
  result: {
    status: ModerationStatus;
    changedAt: Date;
    classifier: Pick<CommentModerationClassfierResult, "labels" | "score">;
  };
  saveAndNotify(): Promise<void>;
}

export class CommentModerationService {
  private knownReactions: Set<string>;
  private notificationService: IModerationNotificationsService;
  private classifierService: ICommentModerationClassifierService;
  private premoderationService: ICommentPremoderationService;

  constructor(options: CommentModerationServiceOptions) {
    this.knownReactions = options.knownReactions;
    this.notificationService = options.notificationService;
    this.classifierService = options.classifierService;
    this.premoderationService = options.premoderationService;
  }

  async moderate(
    comment: Event<"CommentsV1:CommentAdded">["args"],
    references: IndexerAPICommentReferencesSchemaType,
  ): Promise<ModerationStatusResult> {
    // commentType 1 represents reactions
    if (
      comment.commentType === COMMENT_TYPE_REACTION &&
      this.knownReactions.has(comment.content)
    ) {
      return this.createReactionModerationStatusResult();
    }

    const DEFAULT_REVISION_ON_ADD = 0;

    const formattedComment = {
      author: comment.author,
      channelId: comment.channelId,
      content: comment.content,
      id: comment.commentId,
      parentId: comment.parentId,
      references,
      targetUri: comment.targetUri,
      revision: DEFAULT_REVISION_ON_ADD,
    };

    const classifierResult =
      await this.classifierService.classify(formattedComment);

    const premoderationResult = await this.premoderationService.moderate(
      formattedComment,
      classifierResult,
    );

    return {
      result: {
        status: premoderationResult.status,
        changedAt: premoderationResult.changedAt,
        classifier: {
          labels: classifierResult.labels,
          score: classifierResult.score,
        },
      },
      saveAndNotify: async () => {
        await Promise.all([
          premoderationResult.save(),
          classifierResult.save(),
        ]);

        const skipNotification =
          premoderationResult.status === "approved" ||
          premoderationResult.action === "skipped";

        if (skipNotification) {
          return;
        }

        const messageId = await this.sendNewNotification({
          comment,
          commentRevision: DEFAULT_REVISION_ON_ADD,
          references,
          classifierResult,
        });

        if (classifierResult.action !== "skipped") {
          await this.sendNewAutomaticClassification({
            messageId,
            comment,
            commentRevision: DEFAULT_REVISION_ON_ADD,
            references,
            classifierResult,
          });
        }
      },
    };
  }

  async moderateUpdate({
    comment,
    commentRevision,
    references,
    existingComment,
  }: {
    comment: Event<"CommentsV1:CommentEdited">["args"];
    commentRevision: number;
    references: IndexerAPICommentReferencesSchemaType;
    existingComment: CommentSelectType;
  }): Promise<ModerationStatusResult> {
    // commentType 1 represents reactions
    if (
      comment.commentType === COMMENT_TYPE_REACTION &&
      this.knownReactions.has(comment.content)
    ) {
      return this.createReactionModerationStatusResult();
    }

    if (commentRevision === existingComment.revision) {
      throw new Error(
        `Comment revision is the same as the existing comment revision: ${commentRevision}`,
      );
    }

    if (comment.content === existingComment.content) {
      return {
        result: {
          status: existingComment.moderationStatus,
          changedAt: existingComment.moderationStatusChangedAt,
          classifier: {
            score: existingComment.moderationClassifierScore,
            labels: existingComment.moderationClassifierResult,
          },
        },
        saveAndNotify: async () => {},
      };
    }

    const formattedComment = {
      author: comment.author,
      channelId: comment.channelId,
      content: comment.content,
      id: comment.commentId,
      parentId: comment.parentId,
      references,
      targetUri: comment.targetUri,
      revision: commentRevision,
    };

    const classifierResult = await this.classifierService.classifyUpdate(
      formattedComment,
      existingComment,
    );

    const premoderationResult = await this.premoderationService.moderateUpdate(
      formattedComment,
      existingComment,
      classifierResult,
    );

    return {
      result: {
        classifier: {
          labels: classifierResult.labels,
          score: classifierResult.score,
        },
        status: premoderationResult.status,
        changedAt: premoderationResult.changedAt,
      },
      saveAndNotify: async () => {
        await Promise.all([
          premoderationResult.save(),
          classifierResult.save(),
        ]);

        const skipNotification =
          premoderationResult.status === "approved" ||
          premoderationResult.action === "skipped";

        if (skipNotification) {
          return;
        }

        const messageId = await this.sendUpdateNotification({
          comment,
          commentRevision,
          references,
          classifierResult,
        });

        if (classifierResult.action !== "skipped") {
          await this.sendUpdateAutomaticClassification({
            messageId,
            comment,
            commentRevision,
            references,
            classifierResult,
          });
        }
      },
    };
  }

  async updateModerationStatus({
    commentId,
    commentRevision,
    callbackQuery,
    status,
    updatedBy,
  }: {
    commentId: Hex;
    /**
     * If omitted it will update the latest revision and all older pending revisions.
     */
    commentRevision: number | undefined;
    callbackQuery: TelegramCallbackQuery | undefined;
    status: ModerationStatus;
    updatedBy: string;
  }): Promise<CommentSelectType> {
    const comment = await this.premoderationService.updateStatus({
      commentId,
      commentRevision,
      status,
      updatedBy,
    });

    if (!comment) {
      throw new CommentNotFoundError(commentId, callbackQuery);
    }

    if (callbackQuery) {
      await this.notificationService.updateMessageWithModerationStatus({
        messageId: callbackQuery.message.message_id,
        comment,
        callbackQuery,
      });
    }

    return comment;
  }

  async requestStatusChange(
    commentId: Hex,
    callbackQuery: TelegramCallbackQuery,
  ): Promise<void> {
    const comment = await this.premoderationService.getCommentById(commentId);

    if (!comment) {
      throw new CommentNotFoundError(commentId, callbackQuery);
    }

    await this.notificationService.updateMessageWithChangeAction({
      messageId: callbackQuery.message.message_id,
      comment,
      callbackQuery,
    });
  }

  async cancelStatusChange(
    commentId: Hex,
    callbackQuery: TelegramCallbackQuery,
  ): Promise<void> {
    const comment = await this.premoderationService.getCommentById(commentId);

    if (!comment) {
      throw new CommentNotFoundError(commentId, callbackQuery);
    }

    await this.notificationService.updateMessageWithChangeAction({
      messageId: callbackQuery.message.message_id,
      comment,
      callbackQuery,
    });
  }

  private createReactionModerationStatusResult(): ModerationStatusResult {
    return {
      result: {
        status: "approved",
        changedAt: new Date(),
        classifier: {
          score: 0,
          labels: {},
        },
      },
      saveAndNotify: async () => {},
    };
  }

  private async sendNewNotification({
    comment,
    commentRevision,
    references,
    classifierResult,
  }: {
    comment: Event<"CommentsV1:CommentAdded">["args"];
    commentRevision: number;
    references: IndexerAPICommentReferencesSchemaType;
    classifierResult: CommentModerationClassfierResult;
  }) {
    return this.notificationService.notifyPendingModeration(
      {
        comment: {
          channelId: comment.channelId,
          author: comment.author,
          content: comment.content,
          targetUri: comment.targetUri,
          references,
          id: comment.commentId,
          parentId: comment.parentId,
          revision: commentRevision,
        },
        classifierResult,
      },
      "create",
    );
  }

  private async sendUpdateNotification({
    comment,
    commentRevision,
    references,
    classifierResult,
  }: {
    comment: Event<"CommentsV1:CommentEdited">["args"];
    commentRevision: number;
    references: IndexerAPICommentReferencesSchemaType;
    classifierResult: CommentModerationClassfierResult;
  }) {
    return this.notificationService.notifyPendingModeration(
      {
        comment: {
          channelId: comment.channelId,
          author: comment.author,
          content: comment.content,
          targetUri: comment.targetUri,
          references,
          id: comment.commentId,
          parentId: comment.parentId,
          revision: commentRevision,
        },
        classifierResult,
      },
      "update",
    );
  }

  private async sendNewAutomaticClassification({
    messageId,
    comment,
    commentRevision,
    references,
    classifierResult,
  }: {
    messageId?: number;
    comment: Event<"CommentsV1:CommentAdded">["args"];
    commentRevision: number;
    references: IndexerAPICommentReferencesSchemaType;
    classifierResult: CommentModerationClassfierResult;
  }) {
    return this.notificationService.notifyAutomaticallyClassified(
      {
        comment: {
          channelId: comment.channelId,
          author: comment.author,
          content: comment.content,
          targetUri: comment.targetUri,
          references,
          id: comment.commentId,
          parentId: comment.parentId,
          revision: commentRevision,
        },
        messageId,
        classifierResult,
      },
      "create",
    );
  }

  private async sendUpdateAutomaticClassification({
    messageId,
    comment,
    commentRevision,
    references,
    classifierResult,
  }: {
    messageId?: number;
    comment: Event<"CommentsV1:CommentEdited">["args"];
    commentRevision: number;
    references: IndexerAPICommentReferencesSchemaType;
    classifierResult: CommentModerationClassfierResult;
  }) {
    return this.notificationService.notifyAutomaticallyClassified(
      {
        messageId,
        comment: {
          channelId: comment.channelId,
          author: comment.author,
          content: comment.content,
          targetUri: comment.targetUri,
          references,
          id: comment.commentId,
          parentId: comment.parentId,
          revision: commentRevision,
        },
        classifierResult,
      },
      "update",
    );
  }
}
