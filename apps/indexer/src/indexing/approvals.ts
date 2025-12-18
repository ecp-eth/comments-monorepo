import {
  type IndexingFunctionArgs,
  type ponder as Ponder,
} from "ponder:registry";
import { db, eventOutboxService } from "../services/index.ts";
import {
  ponderEventToApprovalAddedEvent,
  ponderEventToApprovalRemovedEvent,
} from "../events/approval/index.ts";
import { schema } from "../../schema.ts";
import { eq, sql } from "drizzle-orm";
import { wrapServiceWithTracing } from "../telemetry.ts";

async function approvalAddedHandler({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1:ApprovalAdded">) {
  const id = `${event.args.author}-${event.args.app}-${context.chain.id}`;

  await db.transaction(async (tx) => {
    const [approval] = await tx
      .insert(schema.approval)
      .values({
        id,
        createdAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
        updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
        author: event.args.author,
        app: event.args.app,
        chainId: context.chain.id,
        txHash: event.transaction.hash,
        logIndex: event.log.logIndex,
        expiresAt: sql`to_timestamp(${event.args.expiry})::timestamptz`,
      })
      .onConflictDoUpdate({
        target: [schema.approval.id],
        set: {
          deletedAt: null,
          updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
          expiresAt: sql`to_timestamp(${event.args.expiry})::timestamptz`,
        },
      })
      .returning()
      .execute();

    if (!approval) {
      throw new Error(`Approval ${id} not found`);
    }

    await eventOutboxService.publishEvent({
      event: ponderEventToApprovalAddedEvent({
        approval,
        event,
        context,
      }),
      aggregateId: approval.id,
      aggregateType: "approval",
      tx,
    });
  });
}

async function approvalRemovedHandler({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1:ApprovalRemoved">) {
  const id = `${event.args.author}-${event.args.app}-${context.chain.id}`;

  await db.transaction(async (tx) => {
    const [approval] = await tx
      .update(schema.approval)
      .set({
        deletedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
        updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
      })
      .where(eq(schema.approval.id, id))
      .returning()
      .execute();

    if (!approval) {
      throw new Error(`Approval ${id} not found`);
    }

    await eventOutboxService.publishEvent({
      event: ponderEventToApprovalRemovedEvent({
        approval,
        event,
        context,
      }),
      aggregateId: approval.id,
      aggregateType: "approval",
      tx,
    });
  });
}

export function initializeApprovalEventsIndexing(ponder: typeof Ponder) {
  ponder.on(
    "CommentsV1:ApprovalAdded",
    wrapServiceWithTracing(approvalAddedHandler),
  );

  ponder.on(
    "CommentsV1:ApprovalRemoved",
    wrapServiceWithTracing(approvalRemovedHandler),
  );
}
