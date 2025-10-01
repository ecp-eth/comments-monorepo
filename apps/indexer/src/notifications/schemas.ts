import { z } from "zod";
import { ETHAddressSchema } from "../lib/schemas";
import { HexSchema } from "@ecp.eth/sdk/core";

export const NotificationTypeSchema = z.enum([
  "reply",
  "mention",
  "reaction",
  "quote",
]);

export type NotificationTypeSchemaType = z.infer<typeof NotificationTypeSchema>;

export const NotificationBaseSchema = z.object({
  /**
   * Unique identifier for the deduplication
   */
  uid: z.string().nonempty(),
  /**
   * The address of the recipient of the notification
   */
  recipientAddress: ETHAddressSchema,
  /**
   * The id of the parent of the notification (the entity that triggered the notification)
   */
  parentId: z.string().nonempty(),
  /**
   * The id of the entity that triggered the notification. At the moment it is only comment id.
   */
  entityId: z.string().nonempty(),
  /**
   * The address of the app signer that created the notification
   */
  appSigner: HexSchema,
  /**
   * The address of the author of the entity that triggered the notification
   */
  authorAddress: ETHAddressSchema,
});

/**
 * A reply notification
 */
export const NotificationReplySchema = z
  .object({
    type: z.literal("reply"),
  })
  .merge(NotificationBaseSchema);

export type NotificationReplySchemaInput = z.input<
  typeof NotificationReplySchema
>;

export type NotificationReplySchemaType = z.infer<
  typeof NotificationReplySchema
>;

export const NotificationMentionSchema = z
  .object({
    type: z.literal("mention"),
  })
  .merge(NotificationBaseSchema);

export type NotificationMentionSchemaInput = z.input<
  typeof NotificationMentionSchema
>;

export type NotificationMentionSchemaType = z.infer<
  typeof NotificationMentionSchema
>;

export const NotificationReactionSchema = z
  .object({
    type: z.literal("reaction"),
  })
  .merge(NotificationBaseSchema);

export type NotificationReactionSchemaInput = z.input<
  typeof NotificationReactionSchema
>;

export type NotificationReactionSchemaType = z.infer<
  typeof NotificationReactionSchema
>;

export const NotificationQuoteSchema = z
  .object({
    type: z.literal("quote"),
  })
  .merge(NotificationBaseSchema);

export type NotificationQuoteSchemaInput = z.input<
  typeof NotificationQuoteSchema
>;

export type NotificationQuoteSchemaType = z.infer<
  typeof NotificationQuoteSchema
>;
