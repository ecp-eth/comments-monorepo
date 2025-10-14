#!/usr/bin/env -S node --experimental-transform-types

/**
 * This script deletes users who marked their account to be deleted more than 7 days ago.
 */
import * as Sentry from "@sentry/node";
import { initSentry, waitForIndexerToBeReady } from "./utils.ts";
import { db } from "../src/services/db.ts";
import { z } from "zod";
import { schema } from "../schema.ts";
import { sql } from "drizzle-orm";
import { parseWorkerCommandOptions, workerCommand } from "./shared.ts";

initSentry("delete-users-worker");

const command = workerCommand
  .option(
    "--delete-after-days <days>",
    "Maximum age in days for users to be deleted",
    (value) => z.coerce.number().int().min(1).parse(value),
    7, // Default: 7 days
  )
  .option(
    "--dry-run",
    "Show what would be deleted without actually deleting records",
    false,
  );

const options = parseWorkerCommandOptions<{
  deleteAfterDays: number;
  dryRun: boolean;
}>(command);

console.log("Starting delete users worker");
console.log(
  `Configuration: deleteAfterDays=${options.deleteAfterDays}, dryRun=${options.dryRun}`,
);

const abortController = new AbortController();

if (options.waitForIndexer) {
  console.log("Waiting for indexer to be ready...");

  await waitForIndexerToBeReady({
    signal: abortController.signal,
    indexerUrl: options.indexerUrl,
  });

  console.log("Indexer is ready");
}

// Graceful shutdown
(["SIGINT", "SIGTERM", "SIGHUP"] as NodeJS.Signals[]).forEach((signal) => {
  process.on(signal, () => {
    abortController.abort();
    console.log(`Received ${signal}, shutting down...`);
  });
});

async function deleteUsers() {
  const { count } = await db.transaction(async (tx) => {
    let count = 0;

    if (options.dryRun) {
      const { rows } = await tx.execute<{ count: number }>(sql`
        SELECT COUNT(*)::int as "count" FROM ${schema.user}
        WHERE 
          ${schema.user.deletedAt} IS NOT NULL 
          AND 
          ${schema.user.deletedAt} <= (NOW() - (${options.deleteAfterDays} || ' days')::interval)
      `);

      count = rows[0]?.count ?? 0;
    } else {
      const { rows } = await tx.execute<{ count: number }>(sql`
        WITH 
          deleted_users AS (
            DELETE FROM ${schema.user}
            WHERE 
              ${schema.user.deletedAt} IS NOT NULL 
              AND 
              ${schema.user.deletedAt} <= (NOW() - (${options.deleteAfterDays} || ' days')::interval)
            RETURNING ${schema.user.id}
          )

        SELECT COUNT(*)::int as "count" FROM deleted_users;
      `);

      count = rows[0]?.count ?? 0;
    }

    return { count };
  });

  if (options.dryRun) {
    console.log(`DRY RUN - Would delete ${count} users`);
    return;
  }

  console.log(`Deleted ${count} users`);
}

// Main execution
deleteUsers()
  .then(() => {
    console.log("Delete users worker completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Delete users worker failed", error);
    Sentry.captureException(error);
    void Sentry.flush().then(() => {
      process.exit(1);
    });
  });
