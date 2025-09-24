import { sql } from "drizzle-orm";
import Deferred from "promise-deferred";
import { schema } from "../../../schema.ts";
import type { DB } from "../db.ts";

type EventOutboxFanOutService_FanOutEventsParams = {
  signal: AbortSignal;
};

type EventOutboxFanOutServiceOptions = {
  db: DB;
  /**
   * Polling interval in milliseconds for checking for new events.
   * This works as fallback to LISTEN/NOTIFY if there are no new events.
   *
   * @default 30_000
   */
  pollInterval?: number;
};

export class EventOutboxFanOutService {
  private readonly db: DB;
  private readonly pollInterval: number;
  private shouldProcessBatch: boolean;
  private deferred: Deferred.Deferred<void> | undefined;

  constructor(options: EventOutboxFanOutServiceOptions) {
    this.db = options.db;
    this.pollInterval = options.pollInterval ?? 30_000;
    this.shouldProcessBatch = false;
  }

  async fanOutEvents(
    params: EventOutboxFanOutService_FanOutEventsParams,
  ): Promise<void> {
    const { signal } = params;

    const notificationPgClient = await this.db.$client.connect();

    if (!notificationPgClient) {
      throw new Error("Failed to connect to notification pg client");
    }

    const processBatchListener = () => {
      // if there is a deferred, resolve it (we are already waiting for new events)
      if (this.deferred) {
        this.deferred.resolve();
      } else {
        // this will be picked by the `waitForNewEvents()` method
        // and immediately resolve the new promise (this happens when during the procesing we got new events)
        this.shouldProcessBatch = true;
      }
    };

    // start listening for new events using notifications
    await notificationPgClient.query("LISTEN event_outbox_events");
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
      // if the loop is waiting for new events, resolve the deferred so the abort signal is picked up
      this.deferred?.resolve();
    });

    while (!signal.aborted) {
      /**
       * Select events from event outbox and mark them as locked for update. Then fan out the events to webhooks that are subscribed to the event.
       */
      const { rows } = await this.db.transaction(async (tx) => {
        return tx.execute(sql`
          WITH
            -- 1) Claim a batch of events to be fanned out
            claimed_events AS (
              SELECT * FROM ${schema.eventOutbox}
              WHERE ${schema.eventOutbox.processedAt} IS NULL
              ORDER BY ${schema.eventOutbox.id} ASC
              LIMIT 100
              FOR UPDATE SKIP LOCKED
            ),

            -- 2) Insert the events for subscribers which are interested in the event
            inserted_events AS (
              INSERT INTO ${schema.appWebhookDelivery} (app_webhook_id, event_id, app_id, owner_id)
              SELECT ${schema.appWebhook.id}, e.id, ${schema.appWebhook.appId}, ${schema.appWebhook.ownerId}
              FROM claimed_events e
              JOIN ${schema.appWebhook} ON (
                ${schema.appWebhook.paused} = FALSE
                AND 
                (
                  ${schema.appWebhook.eventFilter} @> ARRAY[e.event_type]
                  OR ${schema.appWebhook.eventFilter} = '{}'
                )
                AND
                (
                  e.event_type != 'test'
                  OR
                  (
                    ${schema.appWebhook.id} = (e.payload->>'webhookId')::uuid
                    AND
                    ${schema.appWebhook.appId} = (e.payload->>'appId')::uuid
                  )
                )
                AND
                -- prevents from sending the events that the webhook has not been subscribed to previously
                -- on reindex. For example if the webhook was updated to subscribe to more events than previously
                -- then on reindex it would send the past events to the webhook. This guarantees that the webhook will pick only 
                -- newer events.
                e.id > GREATEST(${schema.appWebhook.eventOutboxPosition}, (${schema.appWebhook.eventActivations}->>(e.event_type))::bigint)
              )
              ON CONFLICT (app_webhook_id, event_id, retry_number) DO NOTHING
              RETURNING 1
            )

          -- 3) Mark the events as processed
          UPDATE ${schema.eventOutbox}
          SET processed_at = NOW()
          WHERE ${schema.eventOutbox.id} IN (SELECT id FROM claimed_events)
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
