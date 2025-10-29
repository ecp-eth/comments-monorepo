import { z } from "zod";
import {
  EventV1Schema,
  EventFromChainSchema,
  MetadataSetOperationSchema,
  ISO8601DateSchema,
  StringBigintSchema,
} from "./shared.js";
import { HexSchema } from "../../../core/schemas.js";
import {
  IndexerAPICommentReferencesSchema,
  IndexerAPICommentZeroExSwapSchema,
} from "../../schemas.js";
import { MetadataArraySchema } from "../../../comments/schemas.js";

export const EVENT_COMMENT_ADDED = "comment:added" as const;
export const EVENT_COMMENT_HOOK_METADATA_SET =
  "comment:hook:metadata:set" as const;
export const EVENT_COMMENT_DELETED = "comment:deleted" as const;
export const EVENT_COMMENT_EDITED = "comment:edited" as const;
export const EVENT_COMMENT_MODERATION_STATUS_UPDATED =
  "comment:moderation:status:updated" as const;
export const EVENT_COMMENT_REACTIONS_UPDATED =
  "comment:reactions:updated" as const;
export const EVENT_COMMENT_REFERENCES_UPDATED =
  "comment:references:updated" as const;

/**
 * Comment events.
 */
export const CommentEvents = [
  EVENT_COMMENT_ADDED,
  EVENT_COMMENT_HOOK_METADATA_SET,
  EVENT_COMMENT_DELETED,
  EVENT_COMMENT_EDITED,
  EVENT_COMMENT_MODERATION_STATUS_UPDATED,
  EVENT_COMMENT_REACTIONS_UPDATED,
  EVENT_COMMENT_REFERENCES_UPDATED,
] as const;

/**
 * Comment moderation status schema.
 */
export const CommentModerationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export type CommentModerationStatus = z.infer<
  typeof CommentModerationStatusSchema
>;

const CommentEventDataSchema = z.object({
  id: HexSchema,
  /**
   * Created at date. On wire it is a ISO 8601 date and time string.
   */
  createdAt: ISO8601DateSchema,
  /**
   * Updated at date. On wire it is a ISO 8601 date and time string.
   */
  updatedAt: ISO8601DateSchema,
  /**
   * Channel ID. On wire it is a stringified bigint.
   */
  channelId: StringBigintSchema,
  /**
   * Author address.
   */
  author: HexSchema,
  /**
   * App address.
   */
  app: HexSchema,
  content: z.string(),
  commentType: z.number().int(),
  metadata: MetadataArraySchema,
  moderationStatus: CommentModerationStatusSchema,
  references: IndexerAPICommentReferencesSchema,
});

const RootCommentEventDataSchema = CommentEventDataSchema.extend({
  type: z.literal("root"),
  targetUri: z.string(),
});

const ReplyCommentEventDataSchema = CommentEventDataSchema.extend({
  type: z.literal("reply"),
  parentId: HexSchema,
});

/**
 * An event sent to webhook when a comment is added.
 */
export const CommentAddedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_COMMENT_ADDED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Comment data
       */
      comment: z.discriminatedUnion("type", [
        RootCommentEventDataSchema,
        ReplyCommentEventDataSchema,
      ]),
      /**
       * ZeroEx swap data
       */
      zeroExSwap: IndexerAPICommentZeroExSwapSchema.nullable(),
    }),
  })
  .merge(EventV1Schema)
  .merge(EventFromChainSchema);

export type CommentAddedEvent = z.infer<typeof CommentAddedEventSchema>;

/**
 * An event sent to webhook when a comment hook metadata is set.
 */
export const CommentHookMetadataSetEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_COMMENT_HOOK_METADATA_SET),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated comment data
       */
      comment: z.object({
        /**
         * ID of the comment
         */
        id: HexSchema,
        /**
         * Updated at date. On wire it is a ISO 8601 date and time string.
         */
        updatedAt: ISO8601DateSchema,
        /**
         * Hook metadata. On wire it is a ISO 8601 date and time string.
         */
        hookMetadata: MetadataArraySchema,
      }),
      /**
       * Hook metadata operation
       */
      hookMetadataOperation: MetadataSetOperationSchema,
    }),
  })
  .merge(EventV1Schema)
  .merge(EventFromChainSchema);

export type CommentHookMetadataSetEvent = z.infer<
  typeof CommentHookMetadataSetEventSchema
>;

/**
 * An event sent to webhook when a comment is deleted.
 */
export const CommentDeletedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_COMMENT_DELETED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated comment data
       */
      comment: z.object({
        /**
         * ID of the comment
         */
        id: HexSchema,
        /**
         * Deleted at date. On wire it is a ISO 8601 date and time string
         */
        deletedAt: ISO8601DateSchema,
        /**
         * Updated at date. On wire it is a ISO 8601 date and time string
         */
        updatedAt: ISO8601DateSchema,
      }),
    }),
  })
  .merge(EventV1Schema)
  .merge(EventFromChainSchema);

export type CommentDeletedEvent = z.infer<typeof CommentDeletedEventSchema>;

/**
 * An event sent to webhook when a comment is edited.
 */
export const CommentEditedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_COMMENT_EDITED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated comment data
       */
      comment: z.object({
        /**
         * ID of the comment
         */
        id: HexSchema,
        /**
         * Updated at date. On wire it is a ISO 8601 date and time string
         */
        updatedAt: ISO8601DateSchema,
        /**
         * Content of the comment
         */
        content: z.string(),
        /**
         * References of the comment
         */
        references: IndexerAPICommentReferencesSchema,
        /**
         * Moderation status of the comment
         */
        moderationStatus: CommentModerationStatusSchema,
      }),
    }),
  })
  .merge(EventV1Schema)
  .merge(EventFromChainSchema);

export type CommentEditedEvent = z.infer<typeof CommentEditedEventSchema>;

/**
 * An event sent to webhook when a comment moderation status is updated.
 */
export const CommentModerationStatusUpdatedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_COMMENT_MODERATION_STATUS_UPDATED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated comment data
       */
      comment: z.object({
        /**
         * ID of the comment
         */
        id: HexSchema,
        /**
         * Moderation status of the comment
         */
        moderationStatus: CommentModerationStatusSchema,
        /**
         * Moderation status changed at date. On wire it is a ISO 8601 date and time string
         */
        moderationStatusChangedAt: ISO8601DateSchema,
      }),
    }),
  })
  .merge(EventV1Schema);

export type CommentModerationStatusUpdatedEvent = z.infer<
  typeof CommentModerationStatusUpdatedEventSchema
>;

/**
 * An event sent to webhook when a comment reactions are updated.
 */
export const CommentReactionsUpdatedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_COMMENT_REACTIONS_UPDATED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated comment data
       */
      comment: z.object({
        /**
         * ID of the comment
         */
        id: HexSchema,
        /**
         * Reaction counts
         */
        reactionCounts: z.record(z.number()),
      }),
    }),
  })
  .merge(EventV1Schema);

export type CommentReactionsUpdatedEvent = z.infer<
  typeof CommentReactionsUpdatedEventSchema
>;

export const CommentReferencesUpdatedEventSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_REFERENCES_UPDATED),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        references: IndexerAPICommentReferencesSchema,
        referencesResolutionStatus: z.enum([
          "pending",
          "success",
          "failed",
          "partial",
        ]),
        referencesResolutionStatusChangedAt: ISO8601DateSchema,
      }),
    }),
  })
  .merge(EventV1Schema);

export type CommentReferencesUpdatedEvent = z.infer<
  typeof CommentReferencesUpdatedEventSchema
>;

/**
 * Comment events schema.
 */
export const CommentEventsSchema = z.discriminatedUnion("event", [
  CommentAddedEventSchema,
  CommentHookMetadataSetEventSchema,
  CommentDeletedEventSchema,
  CommentEditedEventSchema,
  CommentModerationStatusUpdatedEventSchema,
  CommentReactionsUpdatedEventSchema,
  CommentReferencesUpdatedEventSchema,
]);
