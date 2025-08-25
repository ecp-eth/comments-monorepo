import z from "zod";
import {
  bigintToStringSchema,
  dateToIsoStringSchema,
  EventFromChainSchema,
  MetadataSetOperationSchema,
} from "../shared/schemas";
import { HexSchema } from "@ecp.eth/sdk/core";
import { MetadataArraySchema } from "@ecp.eth/sdk/comments";
import { IndexerAPICommentReferencesSchema } from "@ecp.eth/sdk/indexer";

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
  moderationStatus: z.enum(["pending", "approved", "rejected"]),
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
    event: z.literal("comment:added"),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.discriminatedUnion("type", [
        RootCommentEventDataSchema,
        ReplyCommentEventDataSchema,
      ]),
    }),
  })
  .merge(EventFromChainSchema);

export type CommentAddedEventInput = z.input<typeof CommentAddedEventSchema>;

export type CommentAddedEvent = z.infer<typeof CommentAddedEventSchema>;

export const CommentHookMetadataSetEventSchema = z
  .object({
    event: z.literal("comment:hook:metadata:set"),
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
    event: z.literal("comment:deleted"),
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
    event: z.literal("comment:edited"),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      comment: z.object({
        id: HexSchema,
        updatedAt: dateToIsoStringSchema,
        content: z.string(),
        references: IndexerAPICommentReferencesSchema,
        moderationStatus: z.enum(["pending", "approved", "rejected"]),
      }),
    }),
  })
  .merge(EventFromChainSchema);

export type CommentEditedEventInput = z.input<typeof CommentEditedEventSchema>;

export type CommentEditedEvent = z.infer<typeof CommentEditedEventSchema>;
