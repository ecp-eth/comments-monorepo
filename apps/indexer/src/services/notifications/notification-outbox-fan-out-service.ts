import { sql } from "drizzle-orm";
import Deferred from "promise-deferred";
import { schema } from "../../../schema.ts";
import type { DB } from "../db.ts";

type NotificationOutboxFanOutService_FanOutNotificationsParams = {
  signal: AbortSignal;
};

type NotificationOutboxFanOutServiceOptions = {
  db: DB;
  /**
   * Polling interval in milliseconds for checking for new notifications.
   * This works as fallback to LISTEN/NOTIFY if there are no new notifications.
   *
   * @default 30_000
   */
  pollInterval?: number;
};

export class NotificationOutboxFanOutService {
  private readonly db: DB;
  private readonly pollInterval: number;
  private shouldProcessBatch: boolean;
  private deferred: Deferred.Deferred<void> | undefined;

  constructor(options: NotificationOutboxFanOutServiceOptions) {
    this.db = options.db;
    this.pollInterval = options.pollInterval ?? 30_000;
    this.shouldProcessBatch = false;
  }

  async fanOutNotifications(
    params: NotificationOutboxFanOutService_FanOutNotificationsParams,
  ): Promise<void> {
    const { signal } = params;

    const notificationPgClient = await this.db.$client.connect();

    if (!notificationPgClient) {
      throw new Error("Failed to connect to notification pg client");
    }

    const processBatchListener = () => {
      // if there is a deferred, resolve it (we are already waiting for new notifications)
      if (this.deferred) {
        this.deferred.resolve();
      } else {
        // this will be picked by the `waitForNewEvents()` method
        // and immediately resolve the new promise (this happens when during the procesing we got new events)
        this.shouldProcessBatch = true;
      }
    };

    // start listening for new events using notifications
    await notificationPgClient.query("LISTEN notification_events");
    notificationPgClient.on("notification", processBatchListener);

    // fallback to polling if there were no notifications for {this.interval} seconds
    const intervalId = setInterval(processBatchListener, this.pollInterval);

    /**
     * Cleanup function to be called when the service is aborted (loop is broken on condition)
     */
    const cleanup = () => {
      clearInterval(intervalId);
      notificationPgClient.removeListener("notification", processBatchListener);
      notificationPgClient.release();
      this.deferred?.resolve();
    };

    signal.addEventListener("abort", () => {
      // if the loop is waiting for new notifications, resolve the deferred so the abort signal is picked up
      this.deferred?.resolve();
    });

    while (!signal.aborted) {
      /**
       * Select notifications from notification outbox and mark them as locked for update. Then fan out the notifications to app clients.
       */
      const { rows } = await this.db.transaction(async (tx) => {
        return tx.execute(sql`
          WITH
            -- 1) Claim a batch of notifications to be fanned out
            claimed_notifications AS (
              SELECT * FROM ${schema.notificationOutbox}
              WHERE ${schema.notificationOutbox.processedAt} IS NULL
              ORDER BY ${schema.notificationOutbox.createdAt} ASC
              LIMIT 100
              FOR UPDATE SKIP LOCKED
            ),

            -- 2) Insert the notifications for all app clients
            inserted_notifications AS (
              INSERT INTO ${schema.appNotification} (notification_id, app_id, notification_type, parent_id, app_signer, author_address, recipient_address)
              SELECT 
                c.id as notification_id,
                ${schema.app.id} as app_id,
                c.notification_type,
                c.parent_id,
                c.app_signer,
                c.author_address,
                c.recipient_address
              FROM claimed_notifications c
              JOIN ${schema.app} ON (${schema.app.id} = c.app_id AND ${schema.app.createdAt} <= c.created_at)
              ON CONFLICT (notification_id, app_id) DO NOTHING
              RETURNING 1
            )

          -- 3) Mark the events as processed
          UPDATE ${schema.notificationOutbox}
          SET processed_at = NOW()
          WHERE ${schema.notificationOutbox.id} IN (SELECT id FROM claimed_notifications)
          RETURNING *;
        `);
      });

      // if no rows were returned we essentially processed all the events
      // otherwise we want to drain the queue completely
      if (rows.length === 0) {
        await this.waitForNewEvents();
        // reset the deferred so it will be again created by the waitForNewEvents method
        // and resolved either by notification or interval
        this.deferred = undefined;
        this.shouldProcessBatch = false;
      }
    }

    cleanup();
  }

  private async waitForNewEvents(): Promise<void> {
    this.deferred = new Deferred<void>();

    if (this.shouldProcessBatch) {
      this.deferred.resolve();
    }

    return this.deferred.promise;
  }
}
