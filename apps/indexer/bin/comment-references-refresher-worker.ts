#!/usr/bin/env -S node --experimental-transform-types

/**
 * This script retries comment reference resolution for failed or partial results.
 * It processes records from comment_reference_resolution_results table that have
 * status 'failed' or 'partial' and are not too old (configurable via parameter).
 *
 * The script is supposed to be run as a cron job in sequential manner.
 */
import * as Sentry from "@sentry/node";
import {
  initSentry,
  waitForCommentsToBeIndexed,
  waitForIndexerToBeReady,
} from "./utils.ts";
import { z } from "zod";
import { db } from "../src/services/db.ts";
import { schema } from "../schema.ts";
import { and, eq, inArray, gt } from "drizzle-orm";
import { CommentReferencesResolutionService } from "../src/services/comment-references-resolution-service.ts";
import { CommentReferencesCacheService } from "../src/services/comment-references-cache-service.ts";
import { resolveCommentReferences } from "../src/lib/resolve-comment-references.ts";
import { ensByAddressResolverService } from "../src/services/ens-by-address-resolver.ts";
import { ensByNameResolverService } from "../src/services/ens-by-name-resolver.ts";
import { erc20ByAddressResolverService } from "../src/services/erc20-by-address-resolver.ts";
import { erc20ByTickerResolverService } from "../src/services/erc20-by-ticker-resolver.ts";
import { farcasterByAddressResolverService } from "../src/services/farcaster-by-address-resolver.ts";
import { farcasterByNameResolverService } from "../src/services/farcaster-by-name-resolver.ts";
import { urlResolverService } from "../src/services/url-resolver.ts";
import { parseWorkerCommandOptions, workerCommand } from "./shared.ts";
import { EventOutboxService } from "../src/services/events/event-outbox-service.ts";
import { createCommentReferencesUpdatedEvent } from "../src/events/comment/index.ts";

initSentry("comment-references-refresher-worker");

const command = workerCommand
  .option(
    "--max-age-days <days>",
    "Maximum age in days for failed/partial results to retry",
    (value) => z.coerce.number().int().min(1).parse(value),
    30, // Default: 30 days
  )
  .option(
    "--batch-size <size>",
    "Number of records to process in each batch",
    (value) => z.coerce.number().int().min(1).max(1000).parse(value),
    100, // Default: 100 records per batch
  )
  .option(
    "--dry-run",
    "Show what would be processed without actually updating records",
    false,
  );

const options = parseWorkerCommandOptions<{
  maxAgeDays: number;
  batchSize: number;
  dryRun: boolean;
}>(command);

console.log("Starting comment references refresher worker");
console.log(
  `Configuration: maxAgeDays=${options.maxAgeDays}, batchSize=${options.batchSize}, dryRun=${options.dryRun}`,
);

const abortController = new AbortController();

if (options.waitForIndexer) {
  console.log("Waiting for indexer to be ready...");

  await waitForIndexerToBeReady({
    signal: abortController.signal,
    indexerUrl: options.indexerUrl,
  });

  console.log("Indexer is ready");

  await waitForCommentsToBeIndexed({
    signal: abortController.signal,
  });

  console.log("Comments are indexed");
}

const commentReferencesCacheService = new CommentReferencesCacheService(db);
const commentReferencesResolutionService =
  new CommentReferencesResolutionService({
    commentReferencesCacheService,
    resolveCommentReferences,
    commentReferencesResolvers: {
      ensByAddressResolver: ensByAddressResolverService,
      ensByNameResolver: ensByNameResolverService,
      erc20ByAddressResolver: erc20ByAddressResolverService,
      erc20ByTickerResolver: erc20ByTickerResolverService,
      farcasterByAddressResolver: farcasterByAddressResolverService,
      farcasterByNameResolver: farcasterByNameResolverService,
      urlResolver: urlResolverService,
    },
  });
const eventOutboxService = new EventOutboxService({
  db,
});

// Graceful shutdown
(["SIGINT", "SIGTERM", "SIGHUP"] as NodeJS.Signals[]).forEach((signal) => {
  process.on(signal, () => {
    abortController.abort();
    console.log(`Received ${signal}, shutting down...`);
  });
});

async function processFailedReferences() {
  // Calculate the cutoff time for "not too old"
  const cutoffTime = new Date(
    Date.now() - options.maxAgeDays * 60 * 60 * 1000 * 24,
  );

  console.log(
    `Looking for failed/partial results newer than: ${cutoffTime.toISOString()}`,
  );

  // Find records that need retry
  const failedResults = await db
    .select({
      commentId: schema.commentReferenceResolutionResults.commentId,
      commentRevision: schema.commentReferenceResolutionResults.commentRevision,
      references: schema.commentReferenceResolutionResults.references,
      referencesResolutionStatus:
        schema.commentReferenceResolutionResults.referencesResolutionStatus,
      updatedAt: schema.commentReferenceResolutionResults.updatedAt,
    })
    .from(schema.commentReferenceResolutionResults)
    .where(
      and(
        inArray(
          schema.commentReferenceResolutionResults.referencesResolutionStatus,
          ["failed", "partial"],
        ),
        gt(schema.commentReferenceResolutionResults.createdAt, cutoffTime),
      ),
    )
    .limit(options.batchSize);

  if (failedResults.length === 0) {
    console.log("No failed/partial results found to retry");
    return;
  }

  console.log(`Found ${failedResults.length} failed/partial results to retry`);

  if (options.dryRun) {
    console.log("DRY RUN - Would process the following records:");
    failedResults.forEach((result, index) => {
      console.log(
        `  ${index + 1}. CommentId: ${result.commentId}, Revision: ${result.commentRevision}, Status: ${result.referencesResolutionStatus}, UpdatedAt: ${result.updatedAt.toISOString()}`,
      );
    });
    return;
  }

  // Process each failed result
  let successCount = 0;
  let partialCount = 0;
  let failedCount = 0;

  for (const result of failedResults) {
    if (abortController.signal.aborted) {
      console.log("Abort signal received, stopping processing");
      break;
    }

    console.log(
      `Retrying resolution for commentId: ${result.commentId}, revision: ${result.commentRevision}`,
    );

    try {
      await db.transaction(async (tx) => {
        // Get the comment details to retry resolution
        const comments = await tx
          .select()
          .from(schema.comment)
          .where(eq(schema.comment.id, result.commentId))
          .for("update");

        const comment = comments[0];

        if (!comment) {
          failedCount++;
          console.warn(
            `Comment not found for commentId: ${result.commentId}, skipping`,
          );
          return;
        }

        const resolved =
          await commentReferencesResolutionService.resolveFromNetworkFirst({
            commentId: result.commentId,
            commentRevision: result.commentRevision,
            content: comment.content,
            chainId: comment.chainId,
          });

        switch (resolved.status) {
          case "success":
            successCount++;
            break;
          case "partial":
            partialCount++;
            break;
          case "failed":
            failedCount++;
            break;
        }

        const newRefs = {
          references: resolved.references,
          referencesResolutionStatus: resolved.status,
          referencesResolutionStatusChangedAt: new Date(),
          updatedAt: new Date(),
        };

        await tx
          .update(schema.comment)
          .set(newRefs)
          .where(eq(schema.comment.id, result.commentId));

        await eventOutboxService.publishEvent({
          tx,
          aggregateId: result.commentId,
          aggregateType: "comment",
          event: createCommentReferencesUpdatedEvent({
            comment: {
              ...comment,
              ...newRefs,
            },
          }),
        });
      });
    } catch (error) {
      failedCount++;
      console.error(
        `Failed to retry resolution for commentId: ${result.commentId}`,
        error,
      );

      // Report unexpected failures to Sentry
      Sentry.captureException(error, {
        tags: {
          component: "comment-references-refresher-worker",
          commentId: result.commentId,
          commentRevision: result.commentRevision,
        },
        extra: {
          originalStatus: result.referencesResolutionStatus,
          originalUpdatedAt: result.updatedAt.toISOString(),
        },
      });
    }
  }

  console.log(
    `Processing completed. Success: ${successCount}, Partial: ${partialCount}, Failed: ${failedCount}`,
  );
}

// Main execution
processFailedReferences()
  .then(() => {
    console.log("Comment references refresher worker completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Comment references refresher worker failed", error);
    Sentry.captureException(error);
    Sentry.flush().then(() => {
      process.exit(1);
    });
  });
