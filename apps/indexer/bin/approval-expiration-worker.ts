#!/usr/bin/env -S node --experimental-transform-types

/**
 * This script checks for expired approvals and publishes approval:expired events.
 * It uses a last-checked timestamp to efficiently process only newly expired approvals.
 */
import * as Sentry from "@sentry/node";
import { initSentry, waitForIndexerToBeReady } from "./utils.ts";
import { db } from "../src/services/db.ts";
import { schema } from "../schema.ts";
import * as offchainSchema from "../schema.offchain.ts";
import { and, gt, lte, isNull, asc } from "drizzle-orm";
import { parseWorkerCommandOptions, workerCommand } from "./shared.ts";
import { eventOutboxService } from "../src/services/index.ts";
import { createApprovalExpiredEvent } from "../src/events/approval/index.ts";

initSentry("approval-expiration-worker");

const command = workerCommand.option(
  "--dry-run",
  "Show what would be processed without actually publishing events",
  false,
);

const options = parseWorkerCommandOptions<{
  dryRun: boolean;
}>(command);

console.log("Starting approval expiration checker worker");
console.log(`Configuration: dryRun=${options.dryRun}`);

const abortController = new AbortController();

if (options.waitForIndexer) {
  console.log("Waiting for indexer to be ready...");

  await waitForIndexerToBeReady({
    signal: abortController.signal,
    indexerUrl: options.indexerUrl,
  });

  console.log("Indexer is ready");
}

async function findNewlyExpiredApprovals(
  lastCheckedAt: Date,
  currentTime: Date,
) {
  return db
    .select()
    .from(schema.approval)
    .where(
      and(
        // Approval expired between last check and now
        gt(schema.approval.expiresAt, lastCheckedAt),
        lte(schema.approval.expiresAt, currentTime),
        // Only active (non-deleted) approvals
        isNull(schema.approval.deletedAt),
      ),
    )
    .orderBy(asc(schema.approval.expiresAt));
}

async function processApprovalExpirations() {
  let processedCount = 0;

  await db.transaction(async (tx) => {
    // Get current state with lock for exclusive access
    const [state] = await tx
      .select()
      .from(offchainSchema.approvalExpirationCheckState)
      .for("update");

    const currentTime = new Date();
    const lastCheckedAt = state?.lastCheckedAt ?? new Date(0); // Use epoch time for first run

    console.log(
      `Checking for approvals expired between ${lastCheckedAt.toISOString()} and ${currentTime.toISOString()}`,
    );

    // Find newly expired approvals
    const expiredApprovals = await findNewlyExpiredApprovals(
      lastCheckedAt,
      currentTime,
    );

    console.log(`Found ${expiredApprovals.length} newly expired approvals`);

    if (!options.dryRun && expiredApprovals.length > 0) {
      // Process each expired approval
      for (const approval of expiredApprovals) {
        try {
          const event = createApprovalExpiredEvent(approval);

          await eventOutboxService.publishEvent({
            event,
            aggregateId: approval.id,
            aggregateType: "approval",
            tx,
          });

          console.log(
            `Published expiration event for approval ${approval.id} (expired at ${approval.expiresAt?.toISOString()})`,
          );
          processedCount++;
        } catch (error) {
          console.error(
            `Failed to process expiration for approval ${approval.id}:`,
            error,
          );
          Sentry.captureException(error, {
            tags: {
              approvalId: approval.id,
              operation: "approval-expiration",
            },
          });
          // Continue processing other approvals instead of halting the batch
        }
      }

      // Update last checked timestamp
      await tx
        .insert(offchainSchema.approvalExpirationCheckState)
        .values({
          id: "singleton",
          lastCheckedAt: currentTime,
          updatedAt: currentTime,
        })
        .onConflictDoUpdate({
          target: [offchainSchema.approvalExpirationCheckState.id],
          set: {
            lastCheckedAt: currentTime,
            updatedAt: currentTime,
          },
        });

      console.log(
        `Updated last checked timestamp to ${currentTime.toISOString()}`,
      );
    } else if (options.dryRun && expiredApprovals.length > 0) {
      console.log("DRY RUN: Would have processed the following approvals:");
      for (const approval of expiredApprovals) {
        console.log(
          `- ${approval.id} (author: ${approval.author}, app: ${approval.app}, expired: ${approval.expiresAt?.toISOString()})`,
        );
      }
    }
  });

  return processedCount;
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\\nReceived SIGINT, shutting down gracefully...");
  abortController.abort();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\\nReceived SIGTERM, shutting down gracefully...");
  abortController.abort();
  process.exit(0);
});

try {
  const processedCount = await processApprovalExpirations();

  if (options.dryRun) {
    console.log("DRY RUN completed successfully");
  } else {
    console.log(
      `Approval expiration check completed successfully. Processed ${processedCount} expired approvals.`,
    );
  }

  process.exit(0);
} catch (error) {
  console.error("Approval expiration check failed:", error);
  Sentry.captureException(error);
  process.exit(1);
}
