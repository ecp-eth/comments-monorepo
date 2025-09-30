import { z } from "zod";

export const NotificationTypeSchema = z.enum([
  "reply",
  "mention",
  "reaction",
  "quote",
]);

export type NotificationTypeSchemaType = z.infer<typeof NotificationTypeSchema>;
