#!/usr/bin/env node --experimental-strip-types

/**
 * This script posts a comment to a channel on the broadcast hook contract.
 *
 * Usage:
 *
 * ```
 * ./post-comment.ts <channel-id> <comment> <optional-private-key defaut one of anvil private keys> <optional-rpc-url default anvil rpc> <optional-chain-id = default anvil>
 * ```
 *
 * Example:
 *
 * ```
 * ./post-comment.ts 882322424724248224824 "My comment"
 * ```
 */

import {
  postComment,
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk/comments";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { anvil, base } from "viem/chains";
import { z } from "zod";

/**
 * This is the RPC URL for the local anvil node.
 */
const RPC_URL = "http://localhost:8545";

const appAccount = privateKeyToAccount(generatePrivateKey());

const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ALLOWED_CHAINS = {
  [anvil.id]: anvil,
  [base.id]: base,
};

const [channelId, comment, privateKey, rpcUrl, chainId] = z
  .tuple([
    z.coerce.bigint(),
    z.string().nonempty("Please provide a non-empty comment"),
    z
      .string()
      .startsWith("0x", "Please provide valid private key")
      .default(ANVIL_PRIVATE_KEY),
    z.string().url().default(RPC_URL),
    z.coerce.number().int().default(anvil.id),
  ])
  .parse(process.argv.slice(2));

if (!(chainId in ALLOWED_CHAINS)) {
  console.error(
    `Chain ID ${chainId} is not supported. Supported chains are: ${Object.keys(ALLOWED_CHAINS).join(", ")}`,
  );
  process.exit(1);
}

const chain = ALLOWED_CHAINS[chainId as keyof typeof ALLOWED_CHAINS];

const authorAccount = privateKeyToAccount(privateKey as `0x${string}`);
const authorWalletClient = createWalletClient({
  account: authorAccount,
  chain,
  transport: http(rpcUrl),
}).extend(publicActions);

const commentData = createCommentData({
  app: appAccount.address,
  author: authorAccount.address,
  content: comment,
  channelId,
  targetUri: "https://localhost:3005/channel/" + channelId.toString(),
});

const commentTypedData = createCommentTypedData({
  chainId: chain.id,
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
