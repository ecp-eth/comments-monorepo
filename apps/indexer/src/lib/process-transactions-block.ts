import type { CommentInserType } from "ponder:schema";
import { BlockTransactionSchema } from "./schemas";
import { createCommentTypedData, decodeCommentSuffixData } from "@ecp.eth/sdk";
import type { IndexingFunctionArgs } from "ponder:registry";
import { getAddress, hashTypedData, verifyTypedData } from "viem";
import { transformCommentParentId, transformCommentTargetUri } from "./utils";
import schema from "ponder:schema";

class InvalidAppSignatureError extends Error {}

/**
 * Processes the transactions in block and extracts valid comments that are appended as suffix to calldata of the transaction.
 */
export async function processTransactionsBlock({
  context,
  event,
}: IndexingFunctionArgs<"Transactions:block">) {
  const { transactions } = await context.client.getBlock({
    blockNumber: event.block.number,
    includeTransactions: true,
  });

  const commentsToInsert: CommentInserType[] = [];

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
  }
}
