#!/usr/bin/env node --experimental-strip-types

import * as Sentry from "@sentry/node";
import "./init.ts";
import { env } from "../src/env.ts";
import { eventOutboxFanOutService } from "../src/services/index.ts";

Sentry.init({
  enabled: process.env.NODE_ENV === "production" && !!env.SENTRY_DSN,
  debug: !(process.env.NODE_ENV === "production" && !!env.SENTRY_DSN),
  dsn: env.SENTRY_DSN,
  environment: `fan-out-worker-${process.env.NODE_ENV || "development"}`,
});

console.log("Starting fan out worker");
const abortController = new AbortController();

// graceful shutdown
(["SIGINT", "SIGTERM", "SIGHUP"] as NodeJS.Signals[]).forEach((signal) => {
  process.on(signal, () => {
    abortController.abort();
    console.log(`Received ${signal}, shutting down...`);
  });
});

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
