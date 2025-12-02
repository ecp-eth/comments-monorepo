#!/usr/bin/env -S node --experimental-transform-types

/**
 * This script is used to fan out events from the event outbox to all webhooks that are subscribed to the event.
 */
import { shutdown as shutdownTelemetry } from "../src/telemetry.ts";
import * as Sentry from "@sentry/node";
import { initSentry, waitForIndexerToBeReady } from "./utils.ts";
import { db } from "../src/services/db.ts";
import { EventOutboxFanOutService } from "../src/services/events/event-outbox-fan-out-service.ts";
import { parseWorkerCommandOptions } from "./shared.ts";

initSentry("event-outbox-fan-out-worker");

const options = parseWorkerCommandOptions();

console.log("Starting event outbox fan out worker");
const abortController = new AbortController();

const eventOutboxFanOutService = new EventOutboxFanOutService({
  db,
});

// graceful shutdown
(["SIGINT", "SIGTERM", "SIGHUP"] as NodeJS.Signals[]).forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down...`);
    void shutdownTelemetry().finally(() => {
      abortController.abort();
    });
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

await eventOutboxFanOutService
  .fanOutEvents({
    signal: abortController.signal,
  })
  .then(() => {
    console.log("Event outbox fan out was aborted");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Event outbox fan out worker failed", e);
    Sentry.captureException(e);
    void Sentry.flush().then(() => {
      process.exit(1);
    });
  });
