import { z } from "zod";

export const AppSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  name: z.string(),
  secret: z.string(),
});

export type AppSchemaType = z.infer<typeof AppSchema>;

export const ListAppsResponseSchema = z.object({
  results: z.array(AppSchema),
  pageInfo: z.object({
    totalPages: z.number().int().nonnegative(),
  }),
});

export type ListAppsResponseSchemaType = z.infer<typeof ListAppsResponseSchema>;

export const WebhookEventNamesSchema = z.enum([
  "approval:added",
  "approval:removed",
  "channel:created",
  "channel:updated",
  "channel:hook:status:updated",
  "channel:metadata:set",
  "channel:transferred",
  "comment:added",
  "comment:hook:metadata:set",
  "comment:deleted",
  "comment:edited",
  "comment:moderation:status:updated",
  "test",
]);

export const WebhookAuthConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("http-basic-aut"),
    headerName: z.string().default("Authorization"),
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    type: z.literal("header"),
    headerName: z.string().default("Authorization"),
    headerValue: z.string(),
  }),
  z.object({
    type: z.literal("no-auth"),
  }),
]);

export const AppWebhookSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  name: z.string(),
  url: z.string().url(),
  auth: WebhookAuthConfigSchema,
  eventFilter: z.array(WebhookEventNamesSchema),
  adminOnly: z
    .object({
      paused: z.boolean(),
      pausedAt: z.coerce.date().nullable(),
    })
    .optional(),
});

export type AppWebhookSchemaType = z.infer<typeof AppWebhookSchema>;
