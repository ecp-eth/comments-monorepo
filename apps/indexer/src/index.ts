import { ponder } from "ponder:registry";
import schema from "ponder:schema";
import { getAddress } from "viem";
import {
  transformCommentParentId,
  transformCommentTargetUri,
} from "./lib/utils";
// import { isProfane } from "./lib/profanity-detection";
import { initializeManagement } from "./management";
import { getMutedAccount } from "./management/services/muted-accounts";

await initializeManagement();

ponder.on("CommentsV1:CommentAdded", async ({ event, context }) => {
  const targetUri = transformCommentTargetUri(event.args.commentData.targetUri);

  // uncomment to enable basic profanity detection
  /* 
  if (isProfane(event.args.commentData.content)) {
    return;
  }*/

  if (await getMutedAccount(event.args.commentData.author)) {
    return;
  }

  await context.db.insert(schema.comment).values({
    id: event.args.commentId,
    content: event.args.commentData.content,
    metadata: event.args.commentData.metadata,
    targetUri,
    parentId: transformCommentParentId(event.args.commentData.parentId),
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

  if (
    existingComment &&
    getAddress(existingComment.author) === getAddress(event.args.author)
  ) {
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
