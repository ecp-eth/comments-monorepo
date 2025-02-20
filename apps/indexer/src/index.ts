import {
  COMMENT_CALLDATA_SUFFIX_DELIMITER,
  createCommentTypedData,
  decodeCommentSuffixData,
} from "@ecp.eth/sdk";
import { ponder } from "ponder:registry";
import schema from "ponder:schema";
import { getAddress, hashTypedData } from "viem";
import { normalizeUrl } from "./lib/utils";

function transformTargetUri(targetUri: string) {
  let normalizedTargetUri = targetUri.trim().length > 0 ? targetUri : "";

  try {
    const urlObj = new URL(targetUri);
    normalizedTargetUri = normalizeUrl(urlObj.toString());
  } catch (error) {
    console.error(error);
  }
  return normalizedTargetUri;
}

function transformParentId(parentId: `0x${string}`) {
  return parentId ===
    "0x0000000000000000000000000000000000000000000000000000000000000000" // bytes32(0)
    ? null
    : parentId;
}

ponder.on("CommentsV1:CommentAdded", async ({ event, context }) => {
  const targetUri = transformTargetUri(event.args.commentData.targetUri);

  await context.db.insert(schema.comment).values({
    id: event.args.commentId,
    content: event.args.commentData.content,
    metadata: event.args.commentData.metadata,
    targetUri,
    parentId: transformParentId(event.args.commentData.parentId),
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

ponder.on("Transactions:block", async ({ event, context }) => {
  const { transactions } = await context.client.getBlock({
    blockNumber: event.block.number,
    includeTransactions: true,
  });

  const encodedCommentDatas = transactions
    .map((tx) => ({
      transaction: tx,
      encodedCommentData: tx.input.split(
        COMMENT_CALLDATA_SUFFIX_DELIMITER.slice(2)
      )[1] as `0x${string}` | undefined,
    }))
    // TODO: filter out comment data that is not at the end of the transaction (this should be handled by a 4337 UserOp indexer otherwise ignored)
    .filter(
      (data) => data.encodedCommentData && data.encodedCommentData.length > 0
    );

  const rows = encodedCommentDatas
    .map(({ transaction, encodedCommentData }) => {
      try {
        const { commentData, authorSignature, appSignature } =
          decodeCommentSuffixData(`0x${encodedCommentData}`);

        const commentTypedData = createCommentTypedData({
          chainId: context.network.chainId,
          commentData,
        });

        const commentId = hashTypedData(commentTypedData);
        const targetUri = transformTargetUri(
          commentTypedData.message.targetUri
        );

        // TODO: Check signatures:
        // - author signature is not required if author = tx.from
        // - app signature always required

        return {
          id: commentId,
          content: commentTypedData.message.content,
          metadata: commentTypedData.message.metadata,
          targetUri,
          parentId: transformParentId(commentTypedData.message.parentId),
          author: commentTypedData.message.author,
          appSigner: commentTypedData.message.appSigner,
          salt: commentTypedData.message.salt,
          deadline: commentTypedData.message.deadline,
          chainId: context.network.chainId,
          timestamp: new Date(Number(event.block.timestamp) * 1000),
          txHash: transaction.hash,
        };
      } catch (error) {
        console.error(error);
        return null;
      }
    })
    .filter((row) => row !== null);

  if (rows.length === 0) return;

  await context.db.insert(schema.comment).values(rows);
});
