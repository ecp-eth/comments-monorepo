import { type ponder as Ponder } from "ponder:registry";
import { db, eventOutboxService } from "../services/index.ts";
import {
  ponderEventToApprovalAddedEvent,
  ponderEventToApprovalRemovedEvent,
} from "../events/approval/index.ts";
import { schema } from "../../schema.ts";
import { eq } from "drizzle-orm";

export function initializeApprovalEventsIndexing(ponder: typeof Ponder) {
  ponder.on("CommentsV1:ApprovalAdded", async ({ event, context }) => {
    const id = `${event.args.author}-${event.args.app}-${context.chain.id}`;

    await db.transaction(async (tx) => {
      const [approval] = await tx
        .insert(schema.approval)
        .values({
          id,
          createdAt: new Date(Number(event.block.timestamp) * 1000),
          updatedAt: new Date(Number(event.block.timestamp) * 1000),
          author: event.args.author,
          app: event.args.app,
          chainId: context.chain.id,
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
        })
        .onConflictDoUpdate({
          target: [schema.approval.id],
          set: {
            deletedAt: null,
            updatedAt: new Date(Number(event.block.timestamp) * 1000),
            txHash: event.transaction.hash,
            logIndex: event.log.logIndex,
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
  });

  ponder.on("CommentsV1:ApprovalRemoved", async ({ event, context }) => {
    const id = `${event.args.author}-${event.args.app}-${context.chain.id}`;

    await db.transaction(async (tx) => {
      const [approval] = await tx
        .update(schema.approval)
        .set({
          deletedAt: new Date(Number(event.block.timestamp) * 1000),
          updatedAt: new Date(Number(event.block.timestamp) * 1000),
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
  });
}
