import { ponder as Ponder } from "ponder:registry";
import schema from "ponder:schema";

export function initializeApprovalEventsIndexing(ponder: typeof Ponder) {
  ponder.on("CommentsV1:ApprovalAdded", async ({ event, context }) => {
    const id = `${event.args.author}-${event.args.appSigner}-${context.network.chainId}`;

    await context.db
      .insert(schema.approvals)
      .values({
        id,
        author: event.args.author,
        appSigner: event.args.appSigner,
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
    const id = `${event.args.author}-${event.args.appSigner}-${context.network.chainId}`;

    await context.db
      .update(schema.approvals, {
        id,
      })
      .set({
        deletedAt: new Date(Number(event.block.timestamp) * 1000),
      });
  });
}
