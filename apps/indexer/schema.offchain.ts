import { sql, relations } from "drizzle-orm";
import {
  integer,
  primaryKey,
  pgSchema,
  timestamp,
  doublePrecision,
  text,
  index,
  jsonb,
  uuid,
  check,
  unique,
  bigserial,
  boolean,
  bigint,
} from "drizzle-orm/pg-core";
import { ECP_INDEXER_SCHEMA_NAME } from "./src/constants.ts";
import type { Hex } from "viem";
import type { CommentReportStatus } from "./src/management/types.ts";
import type {
  CommentModerationLabelsWithScore,
  ModerationStatus,
} from "./src/services/types.ts";
import type {
  Events,
  EventTypes,
  EventOutboxAggregateType,
} from "./src/events/types.ts";
import type { WebhookAuthConfig } from "./src/webhooks/schemas.ts";

export const offchainSchema = pgSchema(ECP_INDEXER_SCHEMA_NAME);

export const apiKeys = offchainSchema.table(
  "api_keys",
  {
    id: text().notNull().primaryKey(),
    publicKey: text().notNull(),
    name: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index("api_keys_by_public_key_idx").on(table.id)],
);

export const commentClassificationResults = offchainSchema.table(
  "comment_classification_results",
  {
    commentId: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    labels: jsonb().notNull().$type<CommentModerationLabelsWithScore>(),
    score: doublePrecision().notNull(),
    revision: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.commentId, table.revision] })],
);

export const commentModerationStatuses = offchainSchema.table(
  "comment_moderation_statuses",
  {
    commentId: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    moderationStatus: text()
      .notNull()
      .default("pending")
      .$type<ModerationStatus>(),
    updatedBy: text().notNull().default("premoderation"),
    revision: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.revision] }),
    check(
      "moderation_status_enum",
      sql`${table.moderationStatus} IN ('pending', 'approved', 'rejected')`,
    ),
    index("comment_moderation_statuses_by_status_idx").on(
      table.moderationStatus,
    ),
  ],
);

export type CommentModerationStatusesSelectType =
  typeof commentModerationStatuses.$inferSelect;

export const commentReports = offchainSchema.table(
  "comment_reports",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    commentId: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    reportee: text().notNull().$type<Hex>(),
    message: text().notNull(),
    status: text().notNull().default("pending").$type<CommentReportStatus>(),
  },
  (table) => [
    check(
      "comment_report_status_enum",
      sql`${table.status} IN ('pending', 'resolved', 'closed')`,
    ),
    index("comment_reports_by_status_idx").on(table.status),
    index("comment_reports_by_created_at_idx").on(table.createdAt),
  ],
);

export type CommentReportSelectType = typeof commentReports.$inferSelect;

export const mutedAccounts = offchainSchema.table("muted_accounts", {
  account: text().notNull().primaryKey().$type<Hex>(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  reason: text(),
});

export type MutedAccountSelectType = typeof mutedAccounts.$inferSelect;

export const user = offchainSchema.table("user", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  role: text({ enum: ["admin", "user"] })
    .notNull()
    .default("user"),
});

export const userRelations = relations(user, ({ many }) => ({
  authCredentials: many(userAuthCredentials),
  authSessions: many(userAuthSession),
}));

export const userAuthCredentials = offchainSchema.table(
  "user_auth_credentials",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    method: text().notNull().$type<"siwe">(),
    identifier: text().notNull(),
  },
  (table) => [
    unique("user_auth_credentials_by_method_and_identifier_uq").on(
      table.method,
      table.identifier,
    ),
  ],
);

export const userAuthCredentialsRelations = relations(
  userAuthCredentials,
  ({ one }) => ({
    user: one(user, {
      fields: [userAuthCredentials.userId],
      references: [user.id],
    }),
  }),
);

export const userAuthSession = offchainSchema.table("user_auth_session", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  userId: uuid()
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  userAuthCredentialsId: uuid()
    .notNull()
    .references(() => userAuthCredentials.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
});

export const userAuthSessionRelations = relations(
  userAuthSession,
  ({ one }) => ({
    user: one(user, {
      fields: [userAuthSession.userId],
      references: [user.id],
    }),
    authCredentials: one(userAuthCredentials, {
      fields: [userAuthSession.userAuthCredentialsId],
      references: [userAuthCredentials.id],
    }),
  }),
);

export const userAuthSessionSiweRefreshToken = offchainSchema.table(
  "user_auth_session_siwe_refresh_token",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    userAuthSessionId: uuid()
      .notNull()
      .references(() => userAuthSession.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
);

export const userAuthSessionSiweRefreshTokenRelations = relations(
  userAuthSessionSiweRefreshToken,
  ({ one }) => ({
    userAuthSession: one(userAuthSession, {
      fields: [userAuthSessionSiweRefreshToken.userAuthSessionId],
      references: [userAuthSession.id],
    }),
  }),
);

export const app = offchainSchema.table("app", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  ownerId: uuid()
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  name: text().notNull(),
});

export type AppSelectType = typeof app.$inferSelect;

export const appRelations = relations(app, ({ one, many }) => ({
  owner: one(user, {
    fields: [app.ownerId],
    references: [user.id],
  }),
  appSigningKeys: many(appSigningKeys),
  appWebhooks: many(appWebhook),
}));

export const appSigningKeys = offchainSchema.table(
  "app_signing_keys",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp({ withTimezone: true }),
    appId: uuid()
      .notNull()
      .references(() => app.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    secret: text().notNull(),
  },
  (table) => [
    unique("ask_one_active_secret_uq").on(table.appId, table.revokedAt),
  ],
);

export type AppSigningKeysSelectType = typeof appSigningKeys.$inferSelect;

export const appSigningKeysRelations = relations(appSigningKeys, ({ one }) => ({
  app: one(app, {
    fields: [appSigningKeys.appId],
    references: [app.id],
  }),
}));

export const appWebhook = offchainSchema.table(
  "app_webhook",
  {
    id: uuid().primaryKey().defaultRandom(),
    appId: uuid()
      .notNull()
      .references(() => app.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    ownerId: uuid()
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    name: text().notNull(),
    url: text().notNull(),
    auth: jsonb().notNull().$type<WebhookAuthConfig>().default({
      type: "no-auth",
    }),
    eventFilter: text().array().notNull().default([]).$type<EventTypes[]>(),
    paused: boolean().notNull().default(false),
    pausedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("aw_by_event_idx").using("gin", table.eventFilter),
    index("aw_by_paused_status_idx").on(table.paused),
    index("aw_by_id_and_app_id_idx").on(table.id, table.appId),
  ],
);

export type AppWebhookSelectType = typeof appWebhook.$inferSelect;

export const appWebhookRelations = relations(appWebhook, ({ one, many }) => ({
  app: one(app, {
    fields: [appWebhook.appId],
    references: [app.id],
  }),
  deliveries: many(appWebhookDelivery),
}));

export const appWebhookDelivery = offchainSchema.table(
  "app_webhook_delivery",
  {
    id: bigserial({ mode: "bigint" }).primaryKey(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp({ withTimezone: true }),
    ownerId: uuid()
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    appId: uuid()
      .notNull()
      .references(() => app.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    appWebhookId: uuid()
      .notNull()
      .references(() => appWebhook.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    eventId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => eventOutbox.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    status: text({ enum: ["pending", "processing", "success", "failed"] })
      .notNull()
      .default("pending"),
    attemptsCount: integer().notNull().default(0),
    lastError: text(),
  },
  (table) => [
    // prevents double-enqueue and re-sends on reindexing
    unique("awd_dedupe_deliveries_uq").on(table.appWebhookId, table.eventId),
    // used for webhook delivery service worker
    index("aws_by_status_and_next_attempt_at_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
    // used for analytics
    index("awd_by_webhook_idx").on(table.appWebhookId),
    index("awd_by_owner_app_idx").on(table.ownerId, table.appId),
    index("awd_by_owner_webhook_idx").on(table.ownerId, table.appWebhookId),
    index("awd_by_owner_app_webhook_idx").on(
      table.ownerId,
      table.appId,
      table.appWebhookId,
    ),
    index("awd_by_webhook_created_at_range_idx").on(
      table.appWebhookId,
      table.createdAt,
    ),
    index("awd_by_webhook_status_created_at_range_idx").on(
      table.appWebhookId,
      table.status,
      table.createdAt,
    ),
    // this index is used to find the head of the queue for each subscription (FIFO)
    index("aws_heads_per_subscription_idx")
      .on(table.appWebhookId, table.nextAttemptAt, table.id)
      .where(sql`${table.status} IN ('pending', 'processing')`),
    // this index is used to find the inflight deliveries for a subscription
    index("aws_inflight_idx")
      .on(table.appWebhookId, table.status, table.leaseUntil)
      .where(sql`${table.status} = 'processing'`),
  ],
);

export const appWebhookDeliveryRelations = relations(
  appWebhookDelivery,
  ({ one, many }) => ({
    appWebhook: one(appWebhook, {
      fields: [appWebhookDelivery.appWebhookId],
      references: [appWebhook.id],
    }),
    attempts: many(appWebhookDeliveryAttempt),
    event: one(eventOutbox, {
      fields: [appWebhookDelivery.eventId],
      references: [eventOutbox.id],
    }),
  }),
);

export const appWebhookDeliveryAttempt = offchainSchema.table(
  "app_webhook_delivery_attempt",
  {
    id: bigserial({ mode: "bigint" }).primaryKey(),
    attemptedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    attemptNumber: integer().notNull().default(1),
    ownerId: uuid()
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    appId: uuid()
      .notNull()
      .references(() => app.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    appWebhookId: uuid()
      .notNull()
      .references(() => appWebhook.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    appWebhookDeliveryId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => appWebhookDelivery.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    eventId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => eventOutbox.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    responseStatus: integer().notNull(),
    responseMs: integer().notNull(),
    error: text(),
  },
  (table) => [
    // used for analytics
    index("awda_by_owner_idx").on(table.ownerId, table.attemptedAt),
    index("awda_by_owner_app_idx").on(
      table.ownerId,
      table.appId,
      table.attemptedAt,
    ),
    index("awda_by_owner_webhook_idx").on(
      table.ownerId,
      table.appWebhookId,
      table.attemptedAt,
    ),
    index("awda_by_owner_app_webhook_idx").on(
      table.ownerId,
      table.appId,
      table.appWebhookId,
      table.attemptedAt,
    ),
    index("awda_by_webhook_idx").on(table.appWebhookId, table.attemptedAt),
    index("awda_failed_partial_idx")
      .on(table.responseStatus)
      .where(
        sql`${table.responseStatus} < 200 OR ${table.responseStatus} > 399`,
      ),
  ],
);

export const appWebhookDeliveryAttemptRelations = relations(
  appWebhookDeliveryAttempt,
  ({ one }) => ({
    delivery: one(appWebhookDelivery, {
      fields: [appWebhookDeliveryAttempt.appWebhookDeliveryId],
      references: [appWebhookDelivery.id],
    }),
  }),
);

/**
 * This table is used to store events that need to be fan-out to the subscribers.
 */
export const eventOutbox = offchainSchema.table(
  "event_outbox",
  {
    id: bigserial({ mode: "bigint" }).primaryKey(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp({ withTimezone: true }),
    eventUid: text().notNull().unique(),
    eventType: text().$type<EventTypes>().notNull(),
    aggregateType: text().$type<EventOutboxAggregateType>().notNull(), // allows to find all the events produced by the same aggregate type
    aggregateId: text().notNull(), // allows to find all the events produced by the same aggregate
    payload: jsonb().$type<Events>().notNull(),
    payloadSize: integer().notNull().default(0),
  },
  (table) => [index("event_outbox_by_processed_at_idx").on(table.processedAt)],
);
