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
  results: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      name: z.string(),
    }),
  ),
  pageInfo: z.object({
    totalPages: z.number().int().nonnegative(),
  }),
});

export type ListAppsResponseSchemaType = z.infer<typeof ListAppsResponseSchema>;

export const AppCreateRequestSchema = z.object({
  name: z.string().trim().nonempty().max(50),
});

export type AppCreateRequestSchemaType = z.infer<typeof AppCreateRequestSchema>;

export const AppCreateResponseSchema = AppSchema;

export type AppCreateResponseSchemaType = z.infer<
  typeof AppCreateResponseSchema
>;

export const AppUpdateRequestSchema = z.object({
  name: z.string().trim().nonempty().max(50),
});

export type AppUpdateRequestSchemaType = z.infer<typeof AppUpdateRequestSchema>;

export const AppUpdateResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  name: z.string(),
});

export type AppUpdateResponseSchemaType = z.infer<
  typeof AppUpdateResponseSchema
>;

export const AppSecretRefreshResponseSchema = z.object({
  secret: z.string().nonempty(),
});

export type AppSecretRefreshResponseSchemaType = z.infer<
  typeof AppSecretRefreshResponseSchema
>;

export const AppDeleteResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  name: z.string(),
});

export type AppDeleteResponseSchemaType = z.infer<
  typeof AppDeleteResponseSchema
>;

export const WebhookEventNames = [
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
] as const;

export const WebhookEventNamesSchema = z.enum(WebhookEventNames);

export const WebhookAuthConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("http-basic-auth"),
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

export const AppWebhookCreateRequestSchema = z.object({
  url: z.string().url(),
  events: z.array(WebhookEventNamesSchema).min(1),
  auth: WebhookAuthConfigSchema,
  name: z.string().trim().nonempty().max(50),
});

export type AppWebhookCreateRequestSchemaType = z.infer<
  typeof AppWebhookCreateRequestSchema
>;

export const AppWebhookCreateResponseSchema = AppWebhookSchema.omit({
  adminOnly: true,
});

export type AppWebhookCreateResponseSchemaType = z.infer<
  typeof AppWebhookCreateResponseSchema
>;

export const AppWebhookUpdateRequestSchema = z
  .object({
    name: z.string().trim().nonempty().max(50),
    url: z.string().url(),
    auth: WebhookAuthConfigSchema,
    eventFilter: z.array(WebhookEventNamesSchema).min(1),
  })
  .partial();

export type AppWebhookUpdateRequestSchemaType = z.infer<
  typeof AppWebhookUpdateRequestSchema
>;

export const AppWebhookUpdateResponseSchema = AppWebhookSchema;

export type AppWebhookUpdateResponseSchemaType = z.infer<
  typeof AppWebhookUpdateResponseSchema
>;

export const AppWebhookDeleteResponseSchema = AppWebhookSchema;

export type AppWebhookDeleteResponseSchemaType = z.infer<
  typeof AppWebhookDeleteResponseSchema
>;

export const AppWebhooksListResponseSchema = z.object({
  results: z.array(AppWebhookSchema),
  pageInfo: z.object({
    totalPages: z.number().int().nonnegative(),
  }),
});

export type AppWebhooksListResponseSchemaType = z.infer<
  typeof AppWebhooksListResponseSchema
>;

export const AppWebhookListDeliveryAttemptsResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.coerce.bigint(),
      attemptedAt: z.coerce.date(),
      attemptNumber: z.number(),
      responseStatus: z.number(),
      responseMs: z.number(),
      error: z.string().nullable(),
      delivery: z.object({
        event: z.object({
          eventType: z.string(),
        }),
      }),
    }),
  ),
  pageInfo: z.object({
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
    startCursor: z.string().optional(),
    endCursor: z.string().optional(),
  }),
});

export type AppWebhookListDeliveryAttemptsResponseSchemaType = z.infer<
  typeof AppWebhookListDeliveryAttemptsResponseSchema
>;
