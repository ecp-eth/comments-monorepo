#!/usr/bin/env -S node --experimental-transform-types

/**
 * This script is used to fan out events from the event outbox to all webhooks that are subscribed to the event.
 */
import * as Sentry from "@sentry/node";
import { env } from "../src/env.ts";
import { db } from "../src/services/db.ts";
import { EventOutboxFanOutService } from "../src/services/events/event-outbox-fan-out-service.ts";
import { waitForIndexerToBeReady } from "./utils.ts";
import { parseWorkerCommandOptions } from "./shared.ts";

const options = parseWorkerCommandOptions();

Sentry.init({
  enabled: process.env.NODE_ENV === "production" && !!env.SENTRY_DSN,
  debug: !(process.env.NODE_ENV === "production" && !!env.SENTRY_DSN),
  dsn: env.SENTRY_DSN,
  environment: `fan-out-worker-${process.env.NODE_ENV || "development"}`,
});

console.log("Starting fan out worker");
const abortController = new AbortController();

const eventOutboxFanOutService = new EventOutboxFanOutService({
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

await eventOutboxFanOutService
  .fanOutEvents({
    signal: abortController.signal,
  })
  .then(() => {
    console.log("Fan out was aborted");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Fan out worker failed", e);
    Sentry.captureException(e);
    Sentry.flush().then(() => {
      process.exit(1);
    });
  });
