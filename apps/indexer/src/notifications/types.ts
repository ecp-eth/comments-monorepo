import type {
  NotificationMentionSchemaType,
  NotificationQuoteSchemaType,
  NotificationReactionSchemaType,
  NotificationReplySchemaType,
} from "./schemas.ts";

export type Notifications =
  | NotificationMentionSchemaType
  | NotificationQuoteSchemaType
  | NotificationReactionSchemaType
  | NotificationReplySchemaType;
