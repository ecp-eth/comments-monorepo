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
import { type IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";

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
    commentRevision: integer().notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.commentRevision] }),
  ],
);

export const commentReferenceResolutionResults = offchainSchema.table(
  "comment_reference_resolution_results",
  {
    commentId: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    references: jsonb()
      .notNull()
      .$type<IndexerAPICommentReferencesSchemaType>(),
    referencesResolutionStatus: text({
      enum: ["success", "pending", "partial", "failed"],
    })
      .notNull()
      .default("pending"),
    commentRevision: integer().notNull().default(0),
  },
  (table) => [
    primaryKey({
      columns: [table.commentId, table.commentRevision],
    }),
    check(
      "comment_reference_resolution_status_enum",
      sql`${table.referencesResolutionStatus} IN ('success', 'pending', 'partial', 'failed')`,
    ),
    index("comment_reference_resolution_results_by_status_idx").on(
      table.referencesResolutionStatus,
    ),
    index("comment_reference_resolution_results_by_created_at_idx").on(
      table.createdAt,
      table.referencesResolutionStatus,
    ),
  ],
);

export type CommentReferenceResolutionResultsSelectType =
  typeof commentReferenceResolutionResults.$inferSelect;

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
    commentRevision: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.commentRevision] }),
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
  deletedAt: timestamp({ withTimezone: true }),
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

export const userAuthSession = offchainSchema.table(
  "user_auth_session",
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
    userAuthCredentialsId: uuid()
      .notNull()
      .references(() => userAuthCredentials.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    index("uass_by_user_id_idx").on(table.userId),
    index("uass_by_last_used_idx").on(table.lastUsedAt),
  ],
);

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
  (table) => [index("uassrt_by_expires_at_idx").on(table.expiresAt)],
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

export const app = offchainSchema.table(
  "app",
  {
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
  },
  (table) => [
    index("app_by_owner_id_idx").on(table.ownerId),
    /**
     * Used by queries WHERE app_id = ? AND created_at > ? for example in notification fan out service
     * where we don't want to send the notifications for apps that were created after the notification was created
     * (historical reindexing).
     */
    index("app_by_id_created_at_idx").on(table.id, table.createdAt),
  ],
);

export type AppSelectType = typeof app.$inferSelect;

export const appRelations = relations(app, ({ one, many }) => ({
  owner: one(user, {
    fields: [app.ownerId],
    references: [user.id],
  }),
  appSigningKeys: many(appSigningKeys),
  appWebhooks: many(appWebhook),
  appNotification: many(appNotification),
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
    unique("ask_one_active_secret_uq")
      .on(table.appId, table.revokedAt)
      .nullsNotDistinct(),
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
    /**
     * Stores the event type and event outbox head position to prevent replays.
     */
    eventActivations: jsonb()
      .notNull()
      .default({})
      .$type<Record<EventTypes, string>>(),
    /**
     * This is used to track the last event that was processed by the webhook.
     *
     * By being processed we mean that event has been picked up and tried to be delivered.
     * It doesn't mean that the delivery was successful or not. We use FIFO per webhook to deliver the events.
     * If the delivery fails it will be retried later but it doesn't block next event from being processed.
     */
    eventOutboxPosition: bigint({ mode: "bigint" })
      .notNull()
      .default(
        // @ts-expect-error - this is a workaround where drizzle is not able to generate JSON for migrations because of bigint
        0 as bigint,
      ),
  },
  (table) => [
    index("aw_subscriptions_by_event_idx")
      .using("gin", table.eventFilter)
      .where(sql`${table.paused} = FALSE`),
    index("aw_by_paused_status_idx").on(table.paused),
    index("aw_by_id_and_app_id_idx").on(table.id, table.appId),
    index("aw_by_created_at_idx").on(table.createdAt),
    index("aw_by_outbox_position_idx").on(table.eventOutboxPosition),
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
    /**
     * This is used to track the number of times a delivery has been retried.
     */
    retryNumber: integer().notNull().default(0),
  },
  (table) => [
    // prevents double-enqueue and re-sends on reindexing
    unique("awd_dedupe_deliveries_uq").on(
      table.appWebhookId,
      table.eventId,
      table.retryNumber,
    ),
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
    // drizzle doesn't support defining INCLUDE on the index
    // include is useful if you want sort by created_at but also filter
    // by appWebhookId + status IN (...)
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
    index("awd_by_event_retry_number_idx").on(table.eventId, table.retryNumber),
  ],
);

export type AppWebhookDeliverySelectType =
  typeof appWebhookDelivery.$inferSelect;

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
  (table) => [
    index("event_outbox_by_processed_at_idx").on(table.processedAt),
    index("event_outbox_by_created_at_idx").on(table.createdAt),
  ],
);

const notificationTypeColumnType = text({
  enum: ["reply", "mention", "reaction", "quote"],
});

/**
 * This table is used to store notifications all notifications in the system.
 * These notifications are then fan out to app clients.
 */
export const notificationOutbox = offchainSchema.table(
  "notification_outbox",
  {
    id: bigserial({ mode: "bigint" }).primaryKey(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /**
     * For fan out services to track processed and uprocessed notifications
     */
    processedAt: timestamp({ withTimezone: true }),
    /**
     * Unique identifier for the deduplication
     */
    notificationUid: text().notNull().unique(),
    notificationType: notificationTypeColumnType.notNull(),
    /**
     * Author address of the comment that triggered the notification
     */
    authorAddress: text().notNull().$type<Hex>(),
    /**
     * Recipient address of the notification
     */
    recipientAddress: text().notNull().$type<Hex>(),
    /**
     * Parent id can be anything but at the moment it is only comment id. In the future this can also be a channel id, etc.
     */
    parentId: text().notNull(),
    /**
     * The id of the entity that triggered the notification. At the moment it is only comment id.
     */
    entityId: text().notNull(),
    /**
     * App signer that created the comment that triggered the notification
     */
    appSigner: text().notNull().$type<Hex>(),
  },
  (table) => [
    index("nt_by_created_at_unprocessed_idx")
      .on(table.createdAt)
      .where(sql`${table.processedAt} IS NULL`),
  ],
);

/**
 * This table is used to store notifications per each app. It is almost the same copy of the notificationOutbox table
 * but it is used to store notifications per each app.
 */
export const appNotification = offchainSchema.table(
  "app_notification",
  {
    id: bigserial({ mode: "bigint" }).primaryKey(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    notificationType: notificationTypeColumnType.notNull(),
    notificationId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => notificationOutbox.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    appId: uuid()
      .notNull()
      .references(() => app.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    /**
     * Parent id can be anything but at the moment it is only comment id. In the future this can also be a channel id, etc.
     */
    parentId: text().notNull(),
    /**
     * The id of the entity that triggered the notification. At the moment it is only comment id.
     */
    entityId: text().notNull(),
    /**
     * App signer that created the comment that triggered the notification
     */
    appSigner: text().notNull().$type<Hex>(),
    /**
     * Author address of the comment that triggered the notification
     */
    authorAddress: text().notNull().$type<Hex>(),
    /**
     * Recipient address of the notification
     */
    recipientAddress: text().notNull().$type<Hex>(),
    /**
     * When the notification was seen by the recipient
     */
    seenAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    unique("an_dedupe_notifications_uq").on(table.notificationId, table.appId),
    /**
     * Recipient address and app are part of all indexes because they are required in list notifications api endpoints.
     * All indexes end with created_at and id because it is used for ordering and cursor pagination.
     */
    index("an_by_app_recipient_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    index("an_by_app_recipient_type_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      table.notificationType, // = ?, IN ()
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    index("an_by_app_recipient_parent_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      table.parentId, // = ?, IN ()
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    index("an_by_app_recipient_app_signer_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      sql`lower(${table.appSigner})`, // = ?, IN ()
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    /**
     * Composite indexes for multiple conditions, recipient address and app are still required.
     */
    index("an_by_app_recipient_app_signer_type_parent_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      sql`lower(${table.appSigner})`, // = ?, IN ()
      table.notificationType, // = ?, IN (), DISTINCT ON
      table.parentId, // = ?, IN (), DISTINCT ON
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    index("an_by_app_recipient_app_signer_type_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      sql`lower(${table.appSigner})`, // = ?, IN ()
      table.notificationType, // = ?, IN ()
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    index("an_by_app_recipient_app_signer_parent_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      sql`lower(${table.appSigner})`, // = ?, IN ()
      table.parentId, // = ?, IN ()
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    index("an_by_app_recipient_type_parent_all_idx").on(
      table.appId, // = ?
      sql`lower(${table.recipientAddress})`, // = ?, IN ()
      table.notificationType, // = ?, IN (), DISTINCT ON
      table.parentId, // = ?, IN (), DISTINCT ON
      table.createdAt, // =>,<= ?, ORDER BY
      table.id, // =>,<= ?, ORDER BY
    ),
    /**
     * Partial indexes for seen_at filters
     */
    index("an_by_app_recipient_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
    index("an_by_app_recipient_type_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.notificationType, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_type_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.notificationType, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
    index("an_by_app_recipient_parent_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.parentId, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_parent_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.parentId, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
    index("an_by_app_recipient_app_signer_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_app_signer_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
    index("an_by_app_recipient_app_signer_type_parent_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.notificationType, // = ?, IN (), DISTINCT ON
        table.parentId, // = ?, IN (), DISTINCT ON
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_app_signer_type_parent_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.notificationType, // = ?, IN (), DISTINCT ON
        table.parentId, // = ?, IN (), DISTINCT ON
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
    index("an_by_app_recipient_app_signer_type_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.notificationType, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_app_signer_type_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.notificationType, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
    index("an_by_app_recipient_app_signer_parent_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.parentId, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_app_signer_parent_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        sql`lower(${table.appSigner})`, // = ?, IN ()
        table.parentId, // = ?, IN ()
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
    index("an_by_app_recipient_type_parent_seen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.notificationType, // = ?, IN (), DISTINCT ON
        table.parentId, // = ?, IN (), DISTINCT ON
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NOT NULL`),
    index("an_by_app_recipient_type_parent_unseen_idx")
      .on(
        table.appId, // = ?
        sql`lower(${table.recipientAddress})`, // = ?, IN ()
        table.notificationType, // = ?, IN (), DISTINCT ON
        table.parentId, // = ?, IN (), DISTINCT ON
        table.createdAt, // =>,<= ?, ORDER BY
        table.id, // =>,<= ?, ORDER BY
      )
      .where(sql`${table.seenAt} IS NULL`),
  ],
);

export const appNotificationRelations = relations(
  appNotification,
  ({ one }) => ({
    notification: one(notificationOutbox, {
      fields: [appNotification.notificationId],
      references: [notificationOutbox.id],
    }),
    app: one(app, {
      fields: [appNotification.appId],
      references: [app.id],
    }),
  }),
);
