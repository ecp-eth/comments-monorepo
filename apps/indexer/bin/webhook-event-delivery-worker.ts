#!/usr/bin/env node --experimental-transform-types

import * as Sentry from "@sentry/node";
import { env } from "../src/env.ts";
import { db } from "../src/services/db.ts";
import { waitForIndexerToBeReady } from "./utils.ts";
import { WebhookEventDeliveryService } from "../src/services/events/webhook-event-delivery-service.ts";

Sentry.init({
  enabled: process.env.NODE_ENV === "production" && !!env.SENTRY_DSN,
  debug: !(process.env.NODE_ENV === "production" && !!env.SENTRY_DSN),
  dsn: env.SENTRY_DSN,
  environment: `webhook-event-delivery-worker-${process.env.NODE_ENV || "development"}`,
});

console.log("Starting webhook event delivery worker");
const abortController = new AbortController();

export const webhookEventDeliveryService = new WebhookEventDeliveryService({
  db,
});

if (process.env.WAIT_FOR_INDEXER_TO_BE_READY === "true") {
  console.log("Waiting for indexer to be ready...");

  await waitForIndexerToBeReady({ signal: abortController.signal });

  console.log("Indexer is ready");
}

// graceful shutdown
(["SIGINT", "SIGTERM", "SIGHUP"] as NodeJS.Signals[]).forEach((signal) => {
  process.on(signal, () => {
    abortController.abort();
    console.log(`Received ${signal}, shutting down...`);
  });
});

await webhookEventDeliveryService
  .deliverEvents({
    signal: abortController.signal,
  })
  .then(() => {
    console.log("Webhook event delivery worker was aborted");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Webhook event delivery worker failed", e);
    Sentry.captureException(e);
    Sentry.flush().then(() => {
      process.exit(1);
    });
  });
