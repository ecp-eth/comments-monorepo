import type { DB } from "./db";
import type { NotificationTypeSchemaType } from "../notifications/schemas/shared";
import { schema } from "../../schema";
import { and, eq, gt, inArray } from "drizzle-orm";

type NotificationServiceOptions = {
  db: DB;
};

export class NotificationService {
  private readonly db: DB;

  constructor(options: NotificationServiceOptions) {
    this.db = options.db;
  }

  async markNotificationsAsSeen(params: {
    appId: string;
    /**
     * Mark notifications as seen by type, if omitted or empty all notifications will be marked as seen
     */
    types?: NotificationTypeSchemaType[];
    /**
     * The date of the last seen notification, only unseen notifications created after this date will be marked as seen. If omitted all notifications will be marked as seen
     */
    lastSeenNotificationDate?: Date;
  }): Promise<{ count: number }> {
    const { appId, types, lastSeenNotificationDate } = params;

    const result = await this.db
      .update(schema.appNotification)
      .set({
        seenAt: new Date(),
      })
      .where(
        and(
          eq(schema.appNotification.appId, appId),
          ...(types && types.length > 0
            ? [inArray(schema.appNotification.notificationType, types)]
            : []),
          ...(lastSeenNotificationDate
            ? [gt(schema.appNotification.seenAt, lastSeenNotificationDate)]
            : []),
        ),
      )
      .execute();

    return { count: result.rowCount ?? 0 };
  }
}
