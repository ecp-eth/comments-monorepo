import z from "zod";
import {
  bigintToStringSchema,
  CommentModerationStatusSchema,
  dateToIsoStringSchema,
  EventFromChainDbToOpenApiSchema,
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
  EVENT_COMMENT_REFERENCES_UPDATED,
  type CommentAddedEventSchema as OutputCommentAddedEventSchema,
  type CommentHookMetadataSetEventSchema as OutputCommentHookMetadataSetEventSchema,
  type CommentDeletedEventSchema as OutputCommentDeletedEventSchema,
  type CommentEditedEventSchema as OutputCommentEditedEventSchema,
  type CommentModerationStatusUpdatedEventSchema as OutputCommentModerationStatusUpdatedEventSchema,
  type CommentReactionsUpdatedEventSchema as OutputCommentReactionsUpdatedEventSchema,
  type CommentEvents as SDKCommentEvents,
  type CommentReferencesUpdatedEventSchema as OutputCommentReferencesUpdatedEventSchema,
} from "@ecp.eth/sdk/indexer/webhooks/schemas";

export const CommentEvents = [
  EVENT_COMMENT_ADDED,
  EVENT_COMMENT_HOOK_METADATA_SET,
  EVENT_COMMENT_DELETED,
  EVENT_COMMENT_EDITED,
  EVENT_COMMENT_MODERATION_STATUS_UPDATED,
  EVENT_COMMENT_REACTIONS_UPDATED,
  EVENT_COMMENT_REFERENCES_UPDATED,
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
  targetUri: z.string(),
});

const ReplyCommentEventDataSchema = CommentEventDataSchema.extend({
  type: z.literal("reply"),
  parentId: HexSchema,
});

export const CommentEventDataDbToOpenApiSchema = z.object({
  id: HexSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  channelId: z.string(),
  author: HexSchema,
  app: HexSchema,
  content: z.string(),
  commentType: z.number().int(),
  metadata: MetadataArraySchema,
  moderationStatus: CommentModerationStatusSchema,
  references: IndexerAPICommentReferencesSchema,
});

export const RootCommentEventDataDbToOpenApiSchema =
  CommentEventDataDbToOpenApiSchema.extend({
    type: z.literal("root"),
    targetUri: z.string(),
  });
export const ReplyCommentEventDataDbToOpenApiSchema =
  CommentEventDataDbToOpenApiSchema.extend({
    type: z.literal("reply"),
    parentId: HexSchema,
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

export const CommentAddedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_ADDED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.discriminatedUnion("type", [
        RootCommentEventDataDbToOpenApiSchema,
        ReplyCommentEventDataDbToOpenApiSchema,
      ]),
      zeroExSwap: IndexerAPICommentZeroExSwapSchema.nullable(),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type CommentAddedEventInput = z.input<typeof CommentAddedEventSchema>;

export type CommentAddedEvent = z.infer<typeof CommentAddedEventSchema>;

({}) as unknown as z.input<
  typeof CommentAddedEventDbToOpenApiSchema
> satisfies CommentAddedEvent;

({}) as unknown as z.infer<
  typeof CommentAddedEventDbToOpenApiSchema
> satisfies CommentAddedEvent;

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

export const CommentHookMetadataSetEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_HOOK_METADATA_SET),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        updatedAt: z.string().datetime(),
        hookMetadata: MetadataArraySchema,
      }),
      hookMetadataOperation: MetadataSetOperationSchema,
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type CommentHookMetadataSetEventInput = z.input<
  typeof CommentHookMetadataSetEventSchema
>;

export type CommentHookMetadataSetEvent = z.infer<
  typeof CommentHookMetadataSetEventSchema
>;

({}) as unknown as z.input<
  typeof CommentHookMetadataSetEventDbToOpenApiSchema
> satisfies CommentHookMetadataSetEvent;

({}) as unknown as z.infer<
  typeof CommentHookMetadataSetEventDbToOpenApiSchema
> satisfies CommentHookMetadataSetEvent;

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

export const CommentDeletedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_DELETED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        deletedAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type CommentDeletedEventInput = z.input<
  typeof CommentDeletedEventSchema
>;

export type CommentDeletedEvent = z.infer<typeof CommentDeletedEventSchema>;

({}) as unknown as z.input<
  typeof CommentDeletedEventDbToOpenApiSchema
> satisfies CommentDeletedEvent;

({}) as unknown as z.infer<
  typeof CommentDeletedEventDbToOpenApiSchema
> satisfies CommentDeletedEvent;

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

export const CommentEditedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_EDITED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        updatedAt: z.string().datetime(),
        content: z.string(),
        references: IndexerAPICommentReferencesSchema,
        moderationStatus: CommentModerationStatusSchema,
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type CommentEditedEventInput = z.input<typeof CommentEditedEventSchema>;

export type CommentEditedEvent = z.infer<typeof CommentEditedEventSchema>;

({}) as unknown as z.input<
  typeof CommentEditedEventDbToOpenApiSchema
> satisfies CommentEditedEvent;

({}) as unknown as z.infer<
  typeof CommentEditedEventDbToOpenApiSchema
> satisfies CommentEditedEvent;

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

export const CommentModerationStatusUpdatedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_MODERATION_STATUS_UPDATED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        moderationStatus: CommentModerationStatusSchema,
        moderationStatusChangedAt: z.string().datetime(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type CommentModerationStatusUpdatedEventInput = z.input<
  typeof CommentModerationStatusUpdatedEventSchema
>;

export type CommentModerationStatusUpdatedEvent = z.infer<
  typeof CommentModerationStatusUpdatedEventSchema
>;

({}) as unknown as z.input<
  typeof CommentModerationStatusUpdatedEventDbToOpenApiSchema
> satisfies CommentModerationStatusUpdatedEvent;

({}) as unknown as z.infer<
  typeof CommentModerationStatusUpdatedEventDbToOpenApiSchema
> satisfies CommentModerationStatusUpdatedEvent;

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

export const CommentReactionsUpdatedEventDbToOpenApiSchema =
  CommentReactionsUpdatedEventSchema;

export type CommentReactionsUpdatedEventInput = z.input<
  typeof CommentReactionsUpdatedEventSchema
>;

export type CommentReactionsUpdatedEvent = z.infer<
  typeof CommentReactionsUpdatedEventSchema
>;

({}) as unknown as z.input<
  typeof CommentReactionsUpdatedEventDbToOpenApiSchema
> satisfies CommentReactionsUpdatedEvent;

({}) as unknown as z.infer<
  typeof CommentReactionsUpdatedEventDbToOpenApiSchema
> satisfies CommentReactionsUpdatedEvent;

export const CommentReferencesUpdatedEventSchema = z.object({
  event: z.literal(EVENT_COMMENT_REFERENCES_UPDATED),
  uid: z.string(),
  version: z.literal(1),
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
      referencesResolutionStatusChangedAt: dateToIsoStringSchema,
    }),
  }),
});

export const CommentReferencesUpdatedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_COMMENT_REFERENCES_UPDATED),
    uid: z.string(),
    version: z.literal(1),
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
        referencesResolutionStatusChangedAt: z.string().datetime(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type CommentReferencesUpdatedEventInput = z.input<
  typeof CommentReferencesUpdatedEventSchema
>;

export type CommentReferencesUpdatedEvent = z.infer<
  typeof CommentReferencesUpdatedEventSchema
>;

({}) as unknown as z.input<
  typeof CommentReferencesUpdatedEventDbToOpenApiSchema
> satisfies CommentReferencesUpdatedEvent;

({}) as unknown as z.infer<
  typeof CommentReferencesUpdatedEventDbToOpenApiSchema
> satisfies CommentReferencesUpdatedEvent;

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
({}) as unknown as CommentReferencesUpdatedEvent satisfies z.input<
  typeof OutputCommentReferencesUpdatedEventSchema
>;
