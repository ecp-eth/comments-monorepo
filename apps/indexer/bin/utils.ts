import * as Sentry from "@sentry/node";
import { env } from "../src/env.ts";
import { db } from "../src/services/db.ts";
import { schema } from "../schema.ts";

export function initSentry(environmentNamePrefix: string) {
  Sentry.init({
    enabled: process.env.NODE_ENV === "production" && !!env.SENTRY_DSN,
    debug: !(process.env.NODE_ENV === "production" && !!env.SENTRY_DSN),
    dsn: env.SENTRY_DSN,
    environment: `${environmentNamePrefix}-${process.env.NODE_ENV || "development"}`,
  });
}

export async function waitForIndexerToBeReady(params: {
  signal: AbortSignal;
  indexerUrl: string;
}) {
  const { signal, indexerUrl } = params;

  while (true) {
    if (signal.aborted) {
      return;
    }

    try {
      const response = await fetch(new URL("/ready", indexerUrl), {
        signal,
      });

      if (response.status === 200) {
        return;
      }
    } catch (error) {
      console.error("Indexer is not ready yet", error);
    }

    await sleep(1000);
  }
}

export async function waitForCommentsToBeIndexed(params: {
  signal: AbortSignal;
}) {
  const { signal } = params;

  while (true) {
    if (signal.aborted) {
      return;
    }

    const comments = await db
      .select({ id: schema.comment.id })
      .from(schema.comment)
      .execute();

    if (comments.length > 0) {
      return;
    }

    await sleep(1000);
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
