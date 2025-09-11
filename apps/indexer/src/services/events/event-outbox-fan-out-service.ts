import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { schema } from "../../../schema.ts";

type EventOutboxFanOutService_FanOutEventsParams = {
  signal: AbortSignal;
};

type EventOutboxFanOutServiceOptions = {
  db: NodePgDatabase<typeof schema>;
  /**
   * Interval in milliseconds between fan out attempts.
   *
   * @default 500
   */
  interval?: number;
};

export class EventOutboxFanOutService {
  private readonly db: NodePgDatabase<typeof schema>;
  private readonly interval: number;

  constructor(options: EventOutboxFanOutServiceOptions) {
    this.db = options.db;
    this.interval = options.interval ?? 500;
  }

  async fanOutEvents(
    params: EventOutboxFanOutService_FanOutEventsParams,
  ): Promise<void> {
    const { signal } = params;

    while (!signal.aborted) {
      /**
       * Select events from event outbox and mark them as locked for update. Then fan out the events to webhooks that are subscribed to the event.
       */
      await this.db.execute(sql`
        BEGIN;

        WITH
          -- 1) Claim a batch of events to be fan out
          claimed_events AS (
            SELECT * FROM ${schema.eventOutbox}
            WHERE ${schema.eventOutbox.processedAt} IS NULL
            ORDER BY ${schema.eventOutbox.id} ASC
            LIMIT 100
            FOR UPDATE SKIP LOCKED
          ),

          -- 2) Insert the events for subscribers which are interested in the event
          inserted_events AS (
            INSERT INTO ${schema.appWebhookDelivery} (app_webhook_id, event_id)
            SELECT ${schema.appWebhook.id}, e.id
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
            )
            ON CONFLICT (app_webhook_id, event_id) DO NOTHING
            RETURNING 1
          )

        -- 3) Mark the events as processed
        UPDATE ${schema.eventOutbox}
        SET processed_at = NOW()
        WHERE ${schema.eventOutbox.id} IN (SELECT id FROM claimed_events);

        COMMIT;
      `);

      // @todo use NOTIFY/LISTEN to avoid polling
      await new Promise((resolve) => setTimeout(resolve, this.interval));
    }
  }
}
