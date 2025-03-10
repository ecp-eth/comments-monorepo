import type { CommentInsertType } from "ponder:schema";
import { BlockTransactionSchema } from "./schemas";
import { createCommentTypedData, decodeCommentSuffixData } from "@ecp.eth/sdk";
import type { IndexingFunctionArgs } from "ponder:registry";
import { getAddress, hashTypedData, verifyTypedData } from "viem";
import { transformCommentParentId, transformCommentTargetUri } from "./utils";
import schema from "ponder:schema";
import {
  getCachedGetBlockRpcResponseSkipStatus,
  markCachedGetBlockRpcResponseAsSkipped,
} from "./ponder-rpc-results-cache";
import { isSpammer } from "./is-spammer";

class InvalidAppSignatureError extends Error {}

/**
 * Processes the transactions in block and extracts valid comments that are appended as suffix to calldata of the transaction.
 */
export async function processTransactionsBlock({
  context,
  event,
}: IndexingFunctionArgs<"Transactions:block">) {
  /**
   * checks if we have already processed this block in the past and if it doesn't contain any comments
   * so we can shortcircuit the processing fot the irrelevant blocks and also save on storage
   */
  const skipStatus = await getCachedGetBlockRpcResponseSkipStatus(
    event.block.number,
    context.network.chainId
  );

  if (skipStatus === "skipped") {
    // we don't care about this block because it doesn't contain any comments
    return;
  }

  const { transactions } = await context.client.getBlock({
    blockNumber: event.block.number,
    includeTransactions: true,
  });

  const commentsToInsert: CommentInsertType[] = [];

  for (const tx of transactions) {
    const parseResult = BlockTransactionSchema.safeParse(tx);

    if (!parseResult.success) {
      // transaction is not in our interest since it doesn't contain the comment data
      continue;
    }

    // TODO: filter out comment data that is not at the end of the transaction (this should be handled by a 4337 UserOp indexer otherwise ignored)
    const { input } = parseResult.data;

    try {
      const { commentData, authorSignature, appSignature } =
        decodeCommentSuffixData(`0x${input.encodedCommentData}`);

      if (await isSpammer(commentData.author)) {
        return;
      }

      const commentTypedData = createCommentTypedData({
        chainId: context.network.chainId,
        commentData,
      });

      const commentId = hashTypedData(commentTypedData);
      const targetUri = transformCommentTargetUri(
        commentTypedData.message.targetUri
      );

      // TODO: Support smart contract signatures by using client.verifyTypedData
      const isAppSignatureValid = verifyTypedData({
        ...commentTypedData,
        signature: appSignature,
        address: commentTypedData.message.appSigner,
      });

      if (!isAppSignatureValid) {
        console.error("Invalid app signature", {
          ...commentTypedData,
          signature: appSignature,
        });

        throw new InvalidAppSignatureError("Invalid app signature");
      }

      if (getAddress(commentTypedData.message.author) !== getAddress(tx.from)) {
        const isAuthorSignatureValid = verifyTypedData({
          ...commentTypedData,
          signature: authorSignature,
          address: commentTypedData.message.author,
        });

        if (!isAuthorSignatureValid) {
          console.error("Invalid author signature", {
            ...commentTypedData,
            signature: authorSignature,
          });

          return null;
        }
      }

      commentsToInsert.push({
        id: commentId,
        content: commentTypedData.message.content,
        metadata: commentTypedData.message.metadata,
        targetUri,
        parentId: transformCommentParentId(commentTypedData.message.parentId),
        author: commentTypedData.message.author,
        appSigner: commentTypedData.message.appSigner,
        chainId: context.network.chainId,
        timestamp: new Date(Number(event.block.timestamp) * 1000),
        txHash: tx.hash,
      });
    } catch (e) {
      console.error(e);
    }
  }

  if (commentsToInsert.length > 0) {
    await context.db.insert(schema.comment).values(commentsToInsert);
  } else {
    // mark this block as skipped because it doesn't contain any comments
    await markCachedGetBlockRpcResponseAsSkipped(
      event.block.number,
      context.network.chainId
    );
  }
}
