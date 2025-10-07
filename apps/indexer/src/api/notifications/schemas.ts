import { z } from "@hono/zod-openapi";
import {
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
  OpenAPIHexSchema,
} from "../../lib/schemas";
import {
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentOutputSchema,
} from "@ecp.eth/sdk/indexer";

const BaseNotificationSchema = z.object({
  id: OpenAPIBigintStringSchema,
  createdAt: OpenAPIDateStringSchema,
  seen: z.boolean(),
  seenAt: OpenAPIDateStringSchema.nullable(),
  app: OpenAPIHexSchema,
  author: IndexerAPIAuthorDataSchema,
  comment: IndexerAPICommentOutputSchema.openapi({
    description:
      "The comment that has been created by the author. This comment triggered the notification.",
  }),
});

const AppNotificationReplyOutputSchema = z
  .object({
    type: z.literal("reply"),
    replyingTo: IndexerAPICommentOutputSchema,
  })
  .merge(BaseNotificationSchema);

const AppNotificationMentionOutputSchema = z
  .object({
    type: z.literal("mention"),
    mentionedUser: IndexerAPIAuthorDataSchema,
  })
  .merge(BaseNotificationSchema);

const AppNotificationReactionOutputSchema = z
  .object({
    type: z.literal("reaction"),
    reactingTo: IndexerAPICommentOutputSchema,
  })
  .merge(BaseNotificationSchema);

const AppNotificationQuoteOutputSchema = z
  .object({
    type: z.literal("quote"),
    quotedComment: IndexerAPICommentOutputSchema,
  })
  .merge(BaseNotificationSchema);

export const AppNotificationOutputSchema = z.discriminatedUnion("type", [
  AppNotificationReplyOutputSchema,
  AppNotificationMentionOutputSchema,
  AppNotificationReactionOutputSchema,
  AppNotificationQuoteOutputSchema,
]);
