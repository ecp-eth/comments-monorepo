#!/usr/bin/env -S node --experimental-transform-types

/**
 * This script is used to deliver events to webhooks that are subscribed to the event.
 */
import { shutdown as shutdownTelemetry } from "../src/telemetry.ts";
import * as Sentry from "@sentry/node";
import { initSentry, waitForIndexerToBeReady } from "./utils.ts";
import { db } from "../src/services/db.ts";
import { WebhookEventDeliveryService } from "../src/services/events/webhook-event-delivery-service.ts";
import { parseWorkerCommandOptions } from "./shared.ts";

const options = parseWorkerCommandOptions();

initSentry("webhook-event-delivery-worker");

console.log("Starting webhook event delivery worker");
const abortController = new AbortController();

export const webhookEventDeliveryService = new WebhookEventDeliveryService({
  db,
});

if (options.waitForIndexer) {
  console.log("Waiting for indexer to be ready...");

  await waitForIndexerToBeReady({
    signal: abortController.signal,
    indexerUrl: options.indexerUrl,
  });

  console.log("Indexer is ready");
}

// graceful shutdown
(["SIGINT", "SIGTERM", "SIGHUP"] as NodeJS.Signals[]).forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down...`);
    void shutdownTelemetry().finally(() => {
      abortController.abort();
    });
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
    void Sentry.flush().then(() => {
      process.exit(1);
    });
  });
