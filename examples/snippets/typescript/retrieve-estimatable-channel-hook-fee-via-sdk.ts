/**
 * This example shows how to retrieve total estimated fee for posting a comment to a channel with a fee estimatable hook.
 * This example uses the SDK helper function to retrieve the estimated fee.
 * The estimated fee is an "best-effort" estimation of the fee required to post a comment to the hook.
 * Depending on the hook implementation, the estimated fee may not be accurate.
 * In reality, you may want to add buffer fee amount or retry logic to handle the case where the estimated fee is not accurate.
 *
 * Please refer to the [protocol-fee](https://docs.ethcomments.xyz/protocol-fee) for more details.
 *
 * To run this example, you may want to deploy your own contracts and run create-channel.ts to create the
 * test channel.
 */

import {
  ContractFunctionExecutionError,
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { parseEnv } from "./util";
import {
  AuthorAuthMethod,
  CommentData,
  createCommentData,
  createCommentTypedData,
  postComment,
} from "@ecp.eth/sdk/comments";

import {
  createEstimateChannelPostOrEditCommentFeeData,
  estimateChannelPostCommentFee,
} from "@ecp.eth/sdk/channel-manager";
import { privateKeyToAccount } from "viem/accounts";

const {
  authorPrivateKey,
  appPrivateKey,
  rpcUrl,
  chain,
  retrieveEstimatableHookFeeChannelId,
} = parseEnv();

/**
 * This example shows how to retrieve estimated fee for posting a comment to a channel implemented a fee estimatable hook.
 */
async function main() {
  // ========================================
  // STEP 1: Setup clients and accounts
  // ========================================

  // Create a public client for read-only blockchain operations (like estimating fees)
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  // Initialize accounts from private keys
  // The author account will be the one posting the comment
  const authorAccount = privateKeyToAccount(authorPrivateKey);
  // The app account represents the application that manages the channel
  const appAccount = privateKeyToAccount(appPrivateKey);

  // Create a wallet client for write operations (like posting comments)
  const walletClient = createWalletClient({
    account: authorAccount,
    chain: chain,
    transport: http(rpcUrl),
  });

  // ========================================
  // STEP 2: Prepare comment data
  // ========================================

  // Set expiration time to 1 minute from now, this is a rough estimation of the arrival time of the comment.
  // most hooks do not use the field to calculate the fee, but in case they do, these are required and potentially
  // the estimation can be off so be prepared for that (you mway want to add buffer fee amount or retry logic)
  const eta = BigInt(Math.floor(Date.now() / 1000) + 60);

  // Create the comment data structure with all required fields.
  // The helper function makes some default value assumptions to cover common cases.
  // The result is equivalent to the following:
  //
  // {
  //   content: "Hello, world!", // The actual comment text\
  //   targetUri: "https://example.com", // URL this comment is about
  //   commentType: 0, // Type of comment (0 = regular comment)
  //   authMethod: AuthorAuthMethod.DIRECT_TX, // Author will sign and send transaction directly
  //   channelId: retrieveEstimatableHookFeeChannelId, // Channel that has fee estimation
  //   parentId: "0x0000000000000000000000000000000000000000000000000000000000000000", // No parent (top-level comment)
  //   author: authorAccount.address, // Who is posting the comment
  //   app: appAccount.address, // Which app manages this channel
  //   createdAt: eta, // When comment was created
  //   updatedAt: eta, // When comment was last updated
  // }
  const commentData = createEstimateChannelPostOrEditCommentFeeData({
    content: "Hello, world!", // The actual comment text
    targetUri: "https://example.com", // URL this comment is about
    channelId: retrieveEstimatableHookFeeChannelId, // Channel that has fee estimation
    author: authorAccount.address, // Who is posting the comment
    app: appAccount.address, // Which app manages this channel
  });

  // No additional metadata for this example
  const metadata = [];

  // Since we set authMethod to DIRECT_TX, the comment will be posted directly by the author
  const msgSender = authorAccount.address;

  // ========================================
  // STEP 3: Estimate the fee for posting a comment
  // ========================================

  // Call the SDK function to estimate the total fee required to post a comment
  // This will query the channel's hook to determine the exact fee amount
  const totalFeeEstimation = await estimateChannelPostCommentFee({
    commentData,
    metadata,
    msgSender,
    readContract: publicClient.readContract,
    channelId: retrieveEstimatableHookFeeChannelId,
  });

  // ========================================
  // Done: we've retrieved the estimated total fee for posting a comment to the hook
  // ========================================

  console.log(
    "The estimated total fee for posting a comment to the hook is:",
    totalFeeEstimation,
  );

  // ========================================
  // VERIFY STEP 1: Prepare comment data for actual posting
  // ========================================

  // Create comment data for the actual posting (slightly different structure)
  const addCommentData = createCommentData({
    content: "Hello, world!",
    targetUri: "https://example.com",
    commentType: 0,
    channelId: retrieveEstimatableHookFeeChannelId,
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    author: authorAccount.address,
    app: appAccount.address,
  });

  // Create typed data for EIP-712 signature (required for comment posting)
  const typedCommentData = createCommentTypedData({
    commentData: addCommentData,
    chainId: chain.id,
  });

  // The app must sign the comment data to authorize the comment
  const appSignature = await appAccount.signTypedData(typedCommentData);

  // ========================================
  // VERIFY STEP 2: Test with not enough fee
  // ========================================

  let postCommentError: unknown;

  // First, try to post the comment with insufficient fee to demonstrate validation
  // This should fail because the fee is 1 wei less than required
  try {
    console.log("posting comment with not enough fee to see it fail...");
    await postComment({
      comment: addCommentData,
      appSignature,
      writeContract: walletClient.writeContract,
      fee: totalFeeEstimation.baseToken.amount - 1n, // Intentionally insufficient fee
    });
  } catch (error) {
    if (error instanceof ContractFunctionExecutionError) {
      postCommentError = error;
    }
  }

  // Verify that the transaction failed as expected
  if (!postCommentError) {
    throw new Error("post comment should have failed");
  }

  console.log("post comment with not enough fee failed as expected");

  // ========================================
  // VERIFY STEP 3: Post comment with the estimated fee
  // ========================================

  // Now post the comment with the exact fee amount required
  console.log("posting comment with required fee...");
  await postComment({
    comment: addCommentData,
    appSignature,
    writeContract: walletClient.writeContract,
    fee: totalFeeEstimation.baseToken.amount, // Use the exact estimated fee
  });
  console.log("comment posted successfully!");
}

// Execute the main function
main();
