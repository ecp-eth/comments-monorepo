import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { schema } from "../../../schema.ts";
import type { DB } from "../db.ts";
import type { Notifications } from "../../notifications/types.ts";

type NotificationOutboxServiceOptions = {
  db: DB;
};

export class NotificationOutboxService {
  private readonly db: DB;

  constructor(options: NotificationOutboxServiceOptions) {
    this.db = options.db;
  }

  async publishNotifications({
    notifications,
    tx,
  }: {
    notifications: Notifications[];
    /**
     * If provided, the event will be published to the given transaction.
     * If not provided, the event will be published to the default database connection.
     */
    tx?: PgTransaction<
      PgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;
  }): Promise<void> {
    const connection = tx ?? this.db;

    await connection
      .insert(schema.notificationOutbox)
      .values(
        notifications.map((notification) => {
          return {
            notificationType: notification.type,
            notificationUid: notification.uid,
            parentId: notification.parentId,
            recipientAddress: notification.recipientAddress,
            entityId: notification.entityId,
            appSigner: notification.appSigner,
            authorAddress: notification.authorAddress,
          };
        }),
      )
      // dedupe notifications, this can happen if a new version of indexer is deployed
      // and it reindexes on chain data
      .onConflictDoNothing({
        target: [schema.notificationOutbox.notificationUid],
      })
      .execute();
  }
}
