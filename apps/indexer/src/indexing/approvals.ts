import { ponder as Ponder } from "ponder:registry";
import { db } from "../services";
import {
  ponderEventToApprovalAddedEvent,
  ponderEventToApprovalRemovedEvent,
} from "../events/approval";
import { schema } from "../../schema";
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

      const approvalAddedEvent = ponderEventToApprovalAddedEvent({
        approval,
        event,
        context,
      });

      await tx
        .insert(schema.eventOutbox)
        .values({
          eventType: approvalAddedEvent.event,
          eventUid: approvalAddedEvent.uid,
          aggregateType: "approval",
          aggregateId: approvalAddedEvent.data.approval.id,
          payload: approvalAddedEvent,
        })
        .onConflictDoNothing({
          target: [schema.eventOutbox.eventUid],
        })
        .execute();
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

      const approvalRemovedEvent = ponderEventToApprovalRemovedEvent({
        approval,
        event,
        context,
      });

      await tx
        .insert(schema.eventOutbox)
        .values({
          eventType: approvalRemovedEvent.event,
          eventUid: approvalRemovedEvent.uid,
          aggregateType: "approval",
          aggregateId: approvalRemovedEvent.data.approval.id,
          payload: approvalRemovedEvent,
        })
        .onConflictDoNothing({
          target: [schema.eventOutbox.eventUid],
        })
        .execute();
    });
  });
}
