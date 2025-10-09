import type { DB } from "./db.ts";
import type { NotificationTypeSchemaType } from "../notifications/schemas.ts";
import { schema } from "../../schema.ts";
import { and, eq, inArray, isNull, gt } from "drizzle-orm";
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
     * Mark notifications as seen by user(s). Must contain at least one user.
     */
    users: (ETHAddressSchemaType | ENSNameSchemaType)[];
    /**
     * Mark notifications as seen by type, if omitted or empty all notifications will be marked as seen
     */
    types?: NotificationTypeSchemaType[];
    /**
     * The date of the last seen notification, only unseen notifications created after this date will be marked as seen. If omitted all notifications will be marked as seen
     */
    lastSeenNotificationDate?: Date;
  }): Promise<{ count: number }> {
    const { appId, users, types, lastSeenNotificationDate } = params;

    if (users.length === 0) {
      throw new NotificationService_UsersRequiredError();
    }

    const resolvedUsers = await resolveUsersByAddressOrEnsName(
      users,
      this.ensByNameResolver,
    );

    if (resolvedUsers.length === 0) {
      throw new NotificationService_InvalidEnsNamesError();
    }

    const result = await this.db
      .update(schema.appNotification)
      .set({
        seenAt: new Date(),
      })
      .where(
        and(
          eq(schema.appNotification.appId, appId),
          inArray(
            schema.appNotification.recipientAddress,
            resolvedUsers.map((user) => user.toLowerCase() as Hex),
          ),
          isNull(schema.appNotification.seenAt),
          ...(types && types.length > 0
            ? [inArray(schema.appNotification.notificationType, types)]
            : []),
          ...(lastSeenNotificationDate
            ? [gt(schema.appNotification.createdAt, lastSeenNotificationDate)]
            : []),
        ),
      )
      .execute();

    return { count: result.rowCount ?? 0 };
  }
}

export class NotificationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

export class NotificationService_UsersRequiredError extends NotificationServiceError {
  constructor() {
    super("Users are required");
    this.name = "NotificationService_UsersRequiredError";
  }
}

export class NotificationService_InvalidEnsNamesError extends NotificationServiceError {
  constructor() {
    super("Invalid ENS names");
    this.name = "NotificationService_InvalidEnsNamesError";
  }
}
