import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from "../../../schema.ts";
import { eq, sql } from "drizzle-orm";

type WebhookEventDeliveryService_DeliverEventsParams = {
  signal: AbortSignal;
};

type WebhookEventDeliveryServiceOptions = {
  db: NodePgDatabase<typeof schema>;
  /**
   * Interval in milliseconds between fan out attempts.
   *
   * @default 500
   */
  interval?: number;

  /**
   * Number of deliveries to process in a single batch.
   *
   * @default 20
   */
  batchSize?: number;

  /**
   * Maximum number of delivery attempts before giving up.
   *
   * @default 20
   */
  maxDeliveryAttempts?: number;

  /**
   * Timeout for the request to the webhook.
   *
   * @default 5000
   */
  requestTimeout?: number;
};

export class WebhookEventDeliveryService {
  private readonly db: NodePgDatabase<typeof schema>;
  private readonly interval: number;
  private readonly batchSize: number;
  private readonly requestTimeout: number;
  private readonly maxDeliveryAttempts: number;

  constructor(options: WebhookEventDeliveryServiceOptions) {
    this.db = options.db;
    this.interval = options.interval ?? 500;
    this.batchSize = options.batchSize ?? 20;
    this.requestTimeout = options.requestTimeout ?? 5_000;
    this.maxDeliveryAttempts = options.maxDeliveryAttempts ?? 20;
  }

  async deliverEvents(
    params: WebhookEventDeliveryService_DeliverEventsParams,
  ): Promise<void> {
    const { signal } = params;

    while (!signal.aborted) {
      const { rows } = await this.db.execute<{
        id: bigint;
        appWebhookId: string;
        eventId: bigint;
      }>(sql`
        WITH
          -- select the head of the queue for each subscription (FIFO)
          subscription_pending_delivery_heads AS (
            SELECT DISTINCT ON (w.app_webhook_id) w.app_webhook_id, w.next_attempt_at, w.id, w.event_id
            FROM ${schema.appWebhookDelivery} w
            WHERE
              -- include expired leases
              w.status IN ('pending', 'processing')
              AND 
              w.next_attempt_at <= now()
              AND NOT EXISTS(
                SELECT 1
                FROM ${schema.appWebhookDelivery} x
                WHERE
                  x.app_webhook_id = w.app_webhook_id
                  AND
                  x.status = 'processing'
                  AND 
                  x.lease_until > now()
              )
            ORDER BY w.app_webhook_id, w.next_attempt_at, w.id
          ),

          -- avoid lock spray
          subscription_pending_deliveries AS (
            SELECT *
            FROM subscription_pending_delivery_heads
            ORDER BY next_attempt_at, id
            LIMIT ${this.batchSize}
          ),

          -- lock the head of the queue for each subscription (FIFO)
          subscription_pending_deliveries_locked AS (
            SELECT h.*
            FROM subscription_pending_deliveries h
            WHERE pg_try_advisory_xact_lock(hashtextextended(h.app_webhook_id::text, 0)) -- non blocking lock
            ORDER BY h.next_attempt_at, h.id
          )

          -- update the deliveries to processing
          UPDATE ${schema.appWebhookDelivery} d
          SET 
            status = 'processing',
            lease_until = now() + interval '60 seconds',
            attempts_count = CASE WHEN d.status='processing' THEN d.attempts_count ELSE d.attempts_count + 1 END
          FROM subscription_pending_deliveries_locked l
          WHERE l.id = d.id
          RETURNING d.id, d.app_webhook_id, d.event_id
      `);

      if (rows.length === 0) {
        // if there are no rows, wait for the next interval
        await new Promise((resolve) => setTimeout(resolve, this.interval));

        continue;
      }

      // we could use all settled here but we prefer to fail if there is some unhandled error
      await Promise.all(rows.map((row) => this.deliver(row.id)));
    }
  }

  private async deliver(deliveryId: bigint): Promise<void> {
    const delivery = await this.db.query.appWebhookDelivery.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, deliveryId);
      },
      with: {
        appWebhook: true,
        event: true,
      },
    });

    if (!delivery) {
      throw new Error(`Delivery with id ${deliveryId} not found`);
    }

    const { appWebhook, event } = delivery;

    if (!appWebhook) {
      throw new Error(`Delivery with id ${deliveryId} has no app webhook`);
    }

    if (!event) {
      throw new Error(`Delivery with id ${deliveryId} has no event`);
    }

    const start = Date.now();

    try {
      const rawBody = JSON.stringify(event.payload);
      const response = await fetch(appWebhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "manual",
        body: rawBody,
        signal: AbortSignal.timeout(this.requestTimeout),
      }).catch((e) => {
        if (isAbortError(e)) {
          throw new WebhookDeliveryTimeoutError(this.requestTimeout);
        }

        throw e;
      });

      const responseMs = Date.now() - start;

      if (!response.ok) {
        throw new WebhookDeliveryError(
          `Webhook delivery failed with status ${response.status}`,
          response.status,
          responseMs,

          await response.text(),
        );
      }

      await this.db.transaction(async (tx) => {
        await tx
          .insert(schema.appWebhookDeliveryAttempt)
          .values({
            appWebhookId: appWebhook.id,
            appWebhookDeliveryId: deliveryId,
            responseStatus: response.status,
            responseMs,
          })
          .execute();

        await tx
          .update(schema.appWebhookDelivery)
          .set({
            status: "success",
            leaseUntil: null,
          })
          .where(eq(schema.appWebhookDelivery.id, deliveryId))
          .execute();
      });
    } catch (error) {
      if (!(error instanceof WebhookDeliveryError)) {
        throw error;
      }

      await this.db.transaction(async (tx) => {
        await tx
          .insert(schema.appWebhookDeliveryAttempt)
          .values({
            appWebhookId: appWebhook.id,
            appWebhookDeliveryId: deliveryId,
            responseStatus: error.responseStatus,
            responseMs: error.responseMs,
            error: error.responseBodyText,
          })
          .execute();

        if (delivery.attemptsCount < this.maxDeliveryAttempts) {
          const exponentialBackoffSeconds = 2 ** delivery.attemptsCount;
          const maxJitterInSeconds = Math.ceil(exponentialBackoffSeconds * 0.2);
          const jitterInSeconds = Math.random() * maxJitterInSeconds;
          const nextAttemptAtSeconds = Math.round(
            exponentialBackoffSeconds + jitterInSeconds,
          );

          await tx
            .update(schema.appWebhookDelivery)
            .set({
              status: "pending",
              leaseUntil: null,
              nextAttemptAt: sql`now() + interval '${nextAttemptAtSeconds} seconds'`,
            })
            .where(eq(schema.appWebhookDelivery.id, deliveryId))
            .execute();
        } else {
          await tx
            .update(schema.appWebhookDelivery)
            .set({
              status: "failed",
              leaseUntil: null,
              lastError: error.responseBodyText,
            })
            .where(eq(schema.appWebhookDelivery.id, deliveryId))
            .execute();
        }
      });
    }
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (("code" in error && error.code === "ABORT_ERR") ||
      error.name === "AbortError")
  );
}

class WebhookDeliveryError extends Error {
  public readonly responseStatus: number;
  public readonly responseMs: number;
  public readonly responseBodyText: string;

  constructor(
    message: string,
    responseStatus: number,
    responseMs: number,
    responseBodyText: string,
  ) {
    super(message);
    this.responseStatus = responseStatus;
    this.responseMs = responseMs;
    this.responseBodyText = responseBodyText;
  }
}

class WebhookDeliveryTimeoutError extends WebhookDeliveryError {
  constructor(timeoutMs: number) {
    super(
      "Webhook delivery timed out",
      500,
      timeoutMs,
      "Webhook delivery timed out",
    );
  }
}
