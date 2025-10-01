#!/usr/bin/env -S node --experimental-transform-types

/**
 * This script is used to fan out notifications to all app clients.
 */
import * as Sentry from "@sentry/node";
import { db } from "../src/services/db.ts";
import { NotificationOutboxFanOutService } from "../src/services/notifications/notification-outbox-fan-out-service.ts";
import { initSentry, waitForIndexerToBeReady } from "./utils.ts";
import { parseWorkerCommandOptions } from "./shared.ts";

initSentry("notification-outbox-fan-out-worker");

const options = parseWorkerCommandOptions();

console.log("Starting notification outbox fan out worker");
const abortController = new AbortController();

const notificationOutboxFanOutService = new NotificationOutboxFanOutService({
  db,
});

// graceful shutdown
(["SIGINT", "SIGTERM", "SIGHUP"] as NodeJS.Signals[]).forEach((signal) => {
  process.on(signal, () => {
    abortController.abort();
    console.log(`Received ${signal}, shutting down...`);
  });
});

if (options.waitForIndexer) {
  console.log("Waiting for indexer to be ready...");

  await waitForIndexerToBeReady({
    signal: abortController.signal,
    indexerUrl: options.indexerUrl,
  });

  console.log("Indexer is ready");
}

await notificationOutboxFanOutService
  .fanOutNotifications({
    signal: abortController.signal,
  })
  .then(() => {
    console.log("Notification outbox fan out was aborted");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Notification outbox fan out worker failed", e);
    Sentry.captureException(e);
    Sentry.flush().then(() => {
      process.exit(1);
    });
  });
