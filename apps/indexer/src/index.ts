import { ponder } from "ponder:registry";
import schema from "ponder:schema";
import { normalizeUrl } from "./lib/utils";

ponder.on("CommentsV1:CommentAdded", async ({ event, context }) => {
  let normalizedTargetUri =
    event.args.commentData.targetUri.trim().length > 0
      ? event.args.commentData.targetUri
      : "";

  try {
    const urlObj = new URL(event.args.commentData.targetUri);
    normalizedTargetUri = normalizeUrl(urlObj.toString());
  } catch (error) {
    console.error(error);
  }

  await context.db.insert(schema.comment).values({
    id: event.args.commentId,
    content: event.args.commentData.content,
    metadata: event.args.commentData.metadata,
    targetUri: normalizedTargetUri,
    parentId:
      event.args.commentData.parentId !==
      "0x0000000000000000000000000000000000000000000000000000000000000000" // bytes32(0)
        ? event.args.commentData.parentId
        : null,
    author: event.args.commentData.author,
    txHash: event.transaction.hash,
    timestamp: new Date(Number(event.block.timestamp) * 1000),
    chainId: context.network.chainId,
    appSigner: event.args.commentData.appSigner,
    logIndex: event.log.logIndex,
  });
});

ponder.on("CommentsV1:CommentDeleted", async ({ event, context }) => {
  const existingComment = await context.db.find(schema.comment, {
    id: event.args.commentId,
  });

  if (existingComment && existingComment.author === event.args.author) {
    await context.db
      .update(schema.comment, {
        id: event.args.commentId,
      })
      .set({
        deletedAt: new Date(Number(event.block.timestamp) * 1000),
      });
  }
});

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
