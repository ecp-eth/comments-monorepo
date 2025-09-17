import z from "zod";
import {
  bigintToStringSchema,
  CommentModerationStatusSchema,
  dateToIsoStringSchema,
  EventFromChainSchema,
  MetadataSetOperationSchema,
} from "../shared/schemas.ts";
import { HexSchema } from "@ecp.eth/sdk/core";
import { MetadataArraySchema } from "@ecp.eth/sdk/comments";
import {
  IndexerAPICommentReferencesSchema,
  IndexerAPICommentZeroExSwapSchema,
} from "@ecp.eth/sdk/indexer";
import {
  EVENT_COMMENT_ADDED,
  EVENT_COMMENT_HOOK_METADATA_SET,
  EVENT_COMMENT_DELETED,
  EVENT_COMMENT_EDITED,
  EVENT_COMMENT_MODERATION_STATUS_UPDATED,
  EVENT_COMMENT_REACTIONS_UPDATED,
  type CommentAddedEventSchema as OutputCommentAddedEventSchema,
  type CommentHookMetadataSetEventSchema as OutputCommentHookMetadataSetEventSchema,
  type CommentDeletedEventSchema as OutputCommentDeletedEventSchema,
  type CommentEditedEventSchema as OutputCommentEditedEventSchema,
  type CommentModerationStatusUpdatedEventSchema as OutputCommentModerationStatusUpdatedEventSchema,
  type CommentReactionsUpdatedEventSchema as OutputCommentReactionsUpdatedEventSchema,
  type CommentEvents as SDKCommentEvents,
} from "@ecp.eth/sdk/indexer/webhooks/schemas";

export const CommentEvents = [
  EVENT_COMMENT_ADDED,
  EVENT_COMMENT_HOOK_METADATA_SET,
  EVENT_COMMENT_DELETED,
  EVENT_COMMENT_EDITED,
  EVENT_COMMENT_MODERATION_STATUS_UPDATED,
  EVENT_COMMENT_REACTIONS_UPDATED,
] as const;

export type CommentEvent = (typeof CommentEvents)[number];

const CommentEventDataSchema = z.object({
  id: HexSchema,
  createdAt: dateToIsoStringSchema,
  updatedAt: dateToIsoStringSchema,
  channelId: bigintToStringSchema,
  author: HexSchema,
  app: HexSchema,
  content: z.string(),
  commentType: z.number().int(),
  metadata: MetadataArraySchema,
  moderationStatus: CommentModerationStatusSchema,
  references: IndexerAPICommentReferencesSchema,
});

const RootCommentEventDataSchema = CommentEventDataSchema.extend({
  type: z.literal("root"),
});

const ReplyCommentEventDataSchema = CommentEventDataSchema.extend({
  type: z.literal("reply"),
});

export const CommentAddedEventSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_ADDED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.discriminatedUnion("type", [
        RootCommentEventDataSchema,
        ReplyCommentEventDataSchema,
      ]),
      zeroExSwap: IndexerAPICommentZeroExSwapSchema.nullable(),
    }),
  })
  .merge(EventFromChainSchema);

export type CommentAddedEventInput = z.input<typeof CommentAddedEventSchema>;

export type CommentAddedEvent = z.infer<typeof CommentAddedEventSchema>;

export const CommentHookMetadataSetEventSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_HOOK_METADATA_SET),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        updatedAt: dateToIsoStringSchema,
        hookMetadata: MetadataArraySchema,
      }),
      hookMetadataOperation: MetadataSetOperationSchema,
    }),
  })
  .merge(EventFromChainSchema);

export type CommentHookMetadataSetEventInput = z.input<
  typeof CommentHookMetadataSetEventSchema
>;

export type CommentHookMetadataSetEvent = z.infer<
  typeof CommentHookMetadataSetEventSchema
>;

export const CommentDeletedEventSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_DELETED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        deletedAt: dateToIsoStringSchema,
        updatedAt: dateToIsoStringSchema,
      }),
    }),
  })
  .merge(EventFromChainSchema);

export type CommentDeletedEventInput = z.input<
  typeof CommentDeletedEventSchema
>;

export type CommentDeletedEvent = z.infer<typeof CommentDeletedEventSchema>;

export const CommentEditedEventSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_EDITED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        updatedAt: dateToIsoStringSchema,
        content: z.string(),
        references: IndexerAPICommentReferencesSchema,
        moderationStatus: CommentModerationStatusSchema,
      }),
    }),
  })
  .merge(EventFromChainSchema);

export type CommentEditedEventInput = z.input<typeof CommentEditedEventSchema>;

export type CommentEditedEvent = z.infer<typeof CommentEditedEventSchema>;

export const CommentModerationStatusUpdatedEventSchema = z.object({
  event: z.literal(EVENT_COMMENT_MODERATION_STATUS_UPDATED),
  uid: z.string(),
  version: z.literal(1),
  data: z.object({
    comment: z.object({
      id: HexSchema,
      moderationStatus: CommentModerationStatusSchema,
      moderationStatusChangedAt: dateToIsoStringSchema,
    }),
  }),
});

export type CommentModerationStatusUpdatedEventInput = z.input<
  typeof CommentModerationStatusUpdatedEventSchema
>;

export type CommentModerationStatusUpdatedEvent = z.infer<
  typeof CommentModerationStatusUpdatedEventSchema
>;

export const CommentReactionsUpdatedEventSchema = z.object({
  event: z.literal(EVENT_COMMENT_REACTIONS_UPDATED),
  uid: z.string(),
  version: z.literal(1),
  data: z.object({
    comment: z.object({
      id: HexSchema,
      reactionCounts: z.record(z.number()),
    }),
  }),
});

export type CommentReactionsUpdatedEventInput = z.input<
  typeof CommentReactionsUpdatedEventSchema
>;

export type CommentReactionsUpdatedEvent = z.infer<
  typeof CommentReactionsUpdatedEventSchema
>;

// assert that the schema output is the same as input to sdk
({}) as unknown as CommentAddedEvent satisfies z.input<
  typeof OutputCommentAddedEventSchema
>;
({}) as unknown as CommentHookMetadataSetEvent satisfies z.input<
  typeof OutputCommentHookMetadataSetEventSchema
>;
({}) as unknown as CommentDeletedEvent satisfies z.input<
  typeof OutputCommentDeletedEventSchema
>;
({}) as unknown as CommentEditedEvent satisfies z.input<
  typeof OutputCommentEditedEventSchema
>;
({}) as unknown as CommentModerationStatusUpdatedEvent satisfies z.input<
  typeof OutputCommentModerationStatusUpdatedEventSchema
>;
({}) as unknown as CommentReactionsUpdatedEvent satisfies z.input<
  typeof OutputCommentReactionsUpdatedEventSchema
>;
({}) as unknown as typeof SDKCommentEvents satisfies typeof CommentEvents;
