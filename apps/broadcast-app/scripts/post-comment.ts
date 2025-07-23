#!/usr/bin/env node --experimental-strip-types

/**
 * This script posts a comment to a channel on the broadcast hook contract.
 *
 * Usage:
 *
 * ```
 * ./post-comment.ts <private-key> <channel-id> <comment>
 * ```
 *
 * Example:
 *
 * ```
 * ./post-comment.ts 0x1234567890abcdef 1234567890abcdef "My comment"
 * ```
 */

import {
  postComment,
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk/comments";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { anvil } from "viem/chains";
import { z } from "zod";

/**
 * This is the RPC URL for the local anvil node.
 */
const RPC_URL = "http://localhost:8545";

const appAccount = privateKeyToAccount(generatePrivateKey());

const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const [channelId, comment] = z
  .tuple([
    z.coerce.bigint(),
    z.string().nonempty("Please provide a non-empty comment"),
  ])
  .parse(process.argv.slice(2));

const authorAccount = privateKeyToAccount(ANVIL_PRIVATE_KEY);
const authorWalletClient = createWalletClient({
  account: authorAccount,
  chain: anvil,
  transport: http(RPC_URL),
}).extend(publicActions);

const commentData = createCommentData({
  app: appAccount.address,
  author: authorAccount.address,
  content: comment,
  channelId,
  targetUri: "https://localhost:3005/channel/" + channelId.toString(),
});

const commentTypedData = createCommentTypedData({
  chainId: anvil.id,
  commentData,
});

const appSignature = await appAccount.signTypedData(commentTypedData);

const { txHash, wait } = await postComment({
  appSignature,
  comment: commentData,
  writeContract: authorWalletClient.writeContract,
});

console.log(`Waiting for transaction ${txHash} to be mined...`);

const createdComment = await wait({
  getContractEvents: authorWalletClient.getContractEvents,
  waitForTransactionReceipt: authorWalletClient.waitForTransactionReceipt,
});

if (!createdComment) {
  console.error("Comment posting failed");

  process.exit(1);
} else {
  console.log(`Comment posted successfully: ${createdComment.commentId}`);

  process.exit(0);
}
