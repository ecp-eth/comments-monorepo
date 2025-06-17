import * as Sentry from "@sentry/node";
import { env } from "./env";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

declare global {
  // eslint-disable-next-line no-var
  var PONDER_COMMON:
    | {
        // @see https://github.com/ponder-sh/ponder/blob/a72358de29474b39a0e778e56cab66fb171b21e7/packages/core/src/internal/common.ts#L7
        logger: {
          error: (log: { error?: Error; msg: string; service: string }) => void;
          flush: () => Promise<void>;
        };
        // @see https://github.com/ponder-sh/ponder/blob/a72358de29474b39a0e778e56cab66fb171b21e7/packages/core/src/internal/shutdown.ts#L1
        shutdown: {
          add: (callback: () => unknown | Promise<unknown>) => void;
        };
      }
    | undefined;
}

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    debug: process.env.NODE_ENV !== "production",
    environment: process.env.NODE_ENV ?? "development",
    release: process.env["RAILWAY_DEPLOYMENT_ID"] ?? "unknown",
    integrations: [
      nodeProfilingIntegration(),
      Sentry.captureConsoleIntegration({
        levels: ["error", "warn"],
      }),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  // this is hack: we need to be able to report errors to sentry and ponder doesn't use console.error but pino
  if (globalThis.PONDER_COMMON) {
    const originalLoggerError = globalThis.PONDER_COMMON.logger.error;

    globalThis.PONDER_COMMON.logger.error = (log) => {
      originalLoggerError(log);

      console.log("logging to sentry", log);

      if ("error" in log) {
        Sentry.captureException(log.error, {
          extra: {
            service: log.service,
            message: log.msg,
          },
        });
      } else if ("msg" in log) {
        Sentry.captureMessage(log.msg, {
          extra: {
            service: log.service,
          },
        });
      }
    };

    const originalLoggerFlush = globalThis.PONDER_COMMON.logger.flush;

    globalThis.PONDER_COMMON.logger.flush = async () => {
      console.log("flushing logger");
      await originalLoggerFlush();
      console.log("flushed logger");
      await Sentry.flush();
    };

    globalThis.PONDER_COMMON.shutdown.add(async () => {
      console.log("shutdown");
      try {
        await Sentry.flush(2000);
        console.log("Sentry flushed");
      } catch (e) {
        console.error("Failed to flush Sentry", e);
      }
    });
  }
} else {
  console.log("Sentry DSN not set");
}
