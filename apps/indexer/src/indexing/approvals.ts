import { ponder as Ponder } from "ponder:registry";
import schema from "ponder:schema";

export function initializeApprovalEventsIndexing(ponder: typeof Ponder) {
  ponder.on("CommentsV1:ApprovalAdded", async ({ event, context }) => {
    const id = `${event.args.author}-${event.args.app}-${context.network.chainId}`;

    await context.db
      .insert(schema.approval)
      .values({
        id,
        author: event.args.author,
        app: event.args.app,
        chainId: context.network.chainId,
        txHash: event.transaction.hash,
        logIndex: event.log.logIndex,
      })
      .onConflictDoUpdate({
        deletedAt: null,
        txHash: event.transaction.hash,
        logIndex: event.log.logIndex,
      });
  });

  ponder.on("CommentsV1:ApprovalRemoved", async ({ event, context }) => {
    const id = `${event.args.author}-${event.args.app}-${context.network.chainId}`;

    await context.db
      .update(schema.approval, {
        id,
      })
      .set({
        deletedAt: new Date(Number(event.block.timestamp) * 1000),
      });
  });
}
