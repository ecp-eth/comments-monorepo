import type { DB } from "./db.ts";
import type { NotificationTypeSchemaType } from "../notifications/schemas.ts";
import { schema } from "../../schema.ts";
import { and, eq, inArray, isNull, gt, sql } from "drizzle-orm";
import type { ENSByNameResolver } from "../resolvers/index.ts";
import type {
  ENSNameSchemaType,
  ETHAddressSchemaType,
} from "../lib/schemas.ts";
import { resolveUsersByAddressOrEnsName } from "../lib/utils.ts";
import type { Hex } from "viem";

type NotificationServiceOptions = {
  db: DB;
  ensByNameResolver: ENSByNameResolver;
};

export class NotificationService {
  private readonly db: DB;
  private readonly ensByNameResolver: ENSByNameResolver;

  constructor(options: NotificationServiceOptions) {
    this.db = options.db;
    this.ensByNameResolver = options.ensByNameResolver;
  }

  async markNotificationsAsSeen(params: {
    appId: string;
    /**
     * Mark notifications as seen by user.
     */
    user: ETHAddressSchemaType | ENSNameSchemaType;
    /**
     * Mark notifications as seen by type, if omitted or empty all notifications will be marked as seen
     */
    types?: NotificationTypeSchemaType[];
    /**
     * Mark notifications as seen by app signer(s), if omitted all notifications will be marked as seen
     */
    appSigner?: Hex | Hex[];
    /**
     * The date of the last seen notification, only unseen notifications created after this date will be marked as seen. If omitted all notifications will be marked as seen
     */
    lastSeenNotificationDate?: Date;
  }): Promise<{ count: number }> {
    const { appId, user, types, lastSeenNotificationDate, appSigner } = params;

    const [resolvedUser] = await resolveUsersByAddressOrEnsName(
      [user],
      this.ensByNameResolver,
    );

    if (!resolvedUser) {
      throw new NotificationService_InvalidEnsNamesError();
    }

    const lowercasedResolvedUser = resolvedUser.toLowerCase() as Hex;

    const apps = appSigner
      ? Array.isArray(appSigner)
        ? appSigner
        : [appSigner]
      : undefined;

    const { rows } = await this.db.transaction(async (tx) => {
      return await tx.execute<{ count: string }>(sql`
        WITH
          -- 1) we mark notifications as seen based on the conditions
          -- 2) we select unseen notifications from updated notifications table to get unseen groups
          -- 3) we we update unseen groups to have the ids from the updated notifications table
          -- 4) we insert new seen groups (or update them on conflict)
          -- mark notifications as seen
          updated_notifications AS (
            UPDATE ${schema.appNotification}
            SET seen_at = NOW()
            WHERE ${and(
              eq(schema.appNotification.appId, appId),
              eq(
                schema.appNotification.recipientAddress,
                lowercasedResolvedUser,
              ),
              ...(apps && apps.length > 0
                ? [inArray(schema.appNotification.appSigner, apps)]
                : []),
              isNull(schema.appNotification.seenAt),
              ...(types && types.length > 0
                ? [inArray(schema.appNotification.notificationType, types)]
                : []),
              ...(lastSeenNotificationDate
                ? [
                    gt(
                      schema.appNotification.createdAt,
                      lastSeenNotificationDate,
                    ),
                  ]
                : []),
            )}
            RETURNING *
          ),
          -- create distinct groups from updated notifications
          affected_notification_groups AS (
            SELECT DISTINCT ON (app_id, recipient_address, notification_type, parent_id, app_signer)
              app_id, recipient_address, notification_type, parent_id, app_signer, id
            FROM updated_notifications
            -- sort the group and return lowest notification id
            -- so we can then get proper unseen notifications that are older than the older notification in updated batch
            ORDER BY app_id, recipient_address, notification_type, parent_id, app_signer, id ASC
          ),
          -- select new heads for seen notification groups
          new_seen_notification_groups AS (
            SELECT DISTINCT ON (app_id, recipient_address, notification_type, parent_id, app_signer)
              app_id, recipient_address, notification_type, parent_id, app_signer, id, 'seen' as seen_status
            FROM updated_notifications un
            ORDER BY app_id, recipient_address, notification_type, parent_id, app_signer, id DESC
          ),
          -- select new heads for unseen notification groups
          new_unseen_notification_groups AS (
            SELECT DISTINCT ON (an.app_id, an.recipient_address, an.notification_type, an.parent_id, an.app_signer)
              an.app_id, an.recipient_address, an.notification_type, an.parent_id, an.app_signer, an.id, 'unseen' as seen_status
            FROM ${schema.appNotification} an
            JOIN affected_notification_groups ag ON (
              an.app_id = ag.app_id
              AND
              an.recipient_address = ag.recipient_address
              AND
              an.notification_type = ag.notification_type
              AND
              an.parent_id = ag.parent_id
              AND
              an.app_signer = ag.app_signer
              AND
              an.seen_at IS NULL
              AND
              an.id < ag.id -- check for unseen notifications that are older than the older notification in updated batch
            )
            ORDER BY an.app_id, an.recipient_address, an.notification_type, an.parent_id, an.app_signer, an.id DESC
          ),
          -- delete unseen groups (this makes sure that there won't be any unsynced unseen groups after we upsert the new heads)
          -- that could happen if you mark a notification as seen but all previous notifications are also marked as seen already
          deleted_unseen_groups AS (
            DELETE FROM ${schema.appRecipientNotificationGroups}
            USING affected_notification_groups ag
            WHERE 
              ${schema.appRecipientNotificationGroups.appId} = ag.app_id
              AND
              ${schema.appRecipientNotificationGroups.recipientAddress} = ag.recipient_address
              AND
              ${schema.appRecipientNotificationGroups.notificationType} = ag.notification_type
              AND
              ${schema.appRecipientNotificationGroups.parentId} = ag.parent_id
              AND
              ${schema.appRecipientNotificationGroups.appSigner} = ag.app_signer
              AND
              ${schema.appRecipientNotificationGroups.seenStatus} = 'unseen'
            RETURNING 1
          ),
          -- upsert the new heads for notification groups
          upserted_notification_groups AS (
            INSERT INTO ${schema.appRecipientNotificationGroups}
              (app_id, recipient_address, notification_type, parent_id, app_signer, app_notification_id, seen_status, updated_at)
            SELECT *, NOW() as updated_at FROM new_seen_notification_groups nsng
            UNION ALL
            SELECT *, NOW() as updated_at FROM new_unseen_notification_groups nung
            ON CONFLICT (app_id, recipient_address, notification_type, parent_id, app_signer, seen_status)
            DO UPDATE SET app_notification_id = EXCLUDED.app_notification_id
            RETURNING 1
          )

        SELECT COUNT(*) as "count" FROM updated_notifications;
      `);
    });

    return { count: parseInt(rows[0]?.count ?? "0", 10) };
  }
}

export class NotificationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

export class NotificationService_InvalidEnsNamesError extends NotificationServiceError {
  constructor() {
    super("Invalid ENS names");
    this.name = "NotificationService_InvalidEnsNamesError";
  }
}
