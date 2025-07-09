import type { Hex } from "@ecp.eth/sdk/core/schemas";
import type { Event } from "ponder:registry";
import type { CommentSelectType } from "ponder:schema";
import type {
  ICommentModerationClassifierService,
  ICommentPremoderationService,
  IModerationNotificationsService,
  ICommentDbService,
} from "../../services/types";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { CommentModerationClassfierResult } from "../../services/types";

type ModerationStatus = "pending" | "approved" | "rejected";

interface CommentModerationServiceOptions {
  knownReactions: Set<string>;
  notificationService: IModerationNotificationsService;
  premoderationService: ICommentPremoderationService;
  classifierService: ICommentModerationClassifierService;
  commentDbService: ICommentDbService;
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
  private commentDbService: ICommentDbService;

  constructor(options: CommentModerationServiceOptions) {
    this.knownReactions = options.knownReactions;
    this.notificationService = options.notificationService;
    this.classifierService = options.classifierService;
    this.premoderationService = options.premoderationService;
    this.commentDbService = options.commentDbService;
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

    const formattedComment = {
      author: comment.author,
      channelId: comment.channelId,
      content: comment.content,
      id: comment.commentId,
      parentId: comment.parentId,
      references,
      targetUri: comment.targetUri,
    };

    const [premoderationResult, classifierResult] = await Promise.all([
      this.premoderationService.moderate(formattedComment),
      this.classifierService.classify(formattedComment),
    ]);

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
        let messageId: number | undefined;

        await Promise.all([
          premoderationResult.save(),
          classifierResult.save(),
        ]);

        if (premoderationResult.action !== "skipped") {
          messageId = await this.sendNewNotification({
            comment,
            references,
            classifierResult,
          });
        }

        if (classifierResult.action !== "skipped") {
          await this.sendNewAutomaticClassification({
            messageId,
            comment,
            references,
            classifierResult,
          });
        }
      },
    };
  }

  async moderateUpdate({
    comment,
    references,
    existingComment,
  }: {
    comment: Event<"CommentsV1:CommentEdited">["args"];
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
    };

    const [premoderationResult, classifierResult] = await Promise.all([
      this.premoderationService.moderateUpdate(
        formattedComment,
        existingComment,
      ),
      this.classifierService.classifyUpdate(formattedComment, existingComment),
    ]);

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
        let messageId: number | undefined;
        await Promise.all([
          premoderationResult.save(),
          classifierResult.save(),
        ]);

        if (premoderationResult.action !== "skipped") {
          messageId = await this.sendUpdateNotification({
            comment,
            references,
            classifierResult,
          });
        }

        if (classifierResult.action !== "skipped") {
          await this.sendUpdateAutomaticClassification({
            messageId,
            comment,
            references,
            classifierResult,
          });
        }
      },
    };
  }

  async updateModerationStatus(
    commentId: Hex,
    status: ModerationStatus,
  ): Promise<CommentSelectType | undefined> {
    return this.premoderationService.updateStatus(commentId, status);
  }

  async getComment(commentId: Hex): Promise<CommentSelectType | undefined> {
    return this.commentDbService.getCommentById(commentId);
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
    references,
    classifierResult,
  }: {
    comment: Event<"CommentsV1:CommentAdded">["args"];
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
        },
        classifierResult,
      },
      "create",
    );
  }

  private async sendUpdateNotification({
    comment,
    references,
    classifierResult,
  }: {
    comment: Event<"CommentsV1:CommentEdited">["args"];
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
        },
        classifierResult,
      },
      "update",
    );
  }

  private async sendNewAutomaticClassification({
    messageId,
    comment,
    references,
    classifierResult,
  }: {
    messageId?: number;
    comment: Event<"CommentsV1:CommentAdded">["args"];
    references: IndexerAPICommentReferencesSchemaType;
    classifierResult: CommentModerationClassfierResult;
  }) {
    return this.notificationService.notifyAutomaticClassification(
      {
        comment: {
          channelId: comment.channelId,
          author: comment.author,
          content: comment.content,
          targetUri: comment.targetUri,
          references,
          id: comment.commentId,
          parentId: comment.parentId,
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
    references,
    classifierResult,
  }: {
    messageId?: number;
    comment: Event<"CommentsV1:CommentEdited">["args"];
    references: IndexerAPICommentReferencesSchemaType;
    classifierResult: CommentModerationClassfierResult;
  }) {
    return this.notificationService.notifyAutomaticClassification(
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
        },
        classifierResult,
      },
      "update",
    );
  }
}
