// must be the first import
import * as Sentry from "@sentry/node";
import "dotenv/config";
import "./env";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
    Sentry.rewriteFramesIntegration({
      root: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
    }),
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  debug: !dsn,
  enabled: !!dsn,
});
