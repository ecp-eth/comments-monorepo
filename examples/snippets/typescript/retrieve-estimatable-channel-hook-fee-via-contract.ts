/**
 * !!!!!!!!!!!!!!!!!
 * !!! ATTENTION !!!
 * !!!!!!!!!!!!!!!!!
 *
 * Please note this is a snippet for demostration of manually calculating the estimated fee via
 * direction interaction with FeeEstimatableHook contract.
 * We have implemented a generic helper function in the SDK to consolidate the fee retrieving logic.
 * Please refer to the [protocol-fee](https://docs.ethcomments.xyz/protocol-fee) for more details.
 *
 * To run this example, you may want to deploy your own contracts and run create-channel.ts to create the
 * test channel.
 */

import {
  Account,
  Address,
  Chain,
  ContractFunctionExecutionError,
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  ParseAccount,
  PublicClient,
  RpcSchema,
  Transport,
} from "viem";
import { parseEnv } from "./util";
import {
  AuthorAuthMethod,
  CommentData,
  createCommentData,
  createCommentTypedData,
  postComment,
} from "@ecp.eth/sdk/comments";
import { NATIVE_ASSET_ADDRESS } from "@ecp.eth/sdk";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import {
  HookFeeEstimation,
  getChannel,
  getHookTransactionFee,
} from "@ecp.eth/sdk/channel-manager";
import { BaseHookABI } from "@ecp.eth/sdk/abis";
import { privateKeyToAccount } from "viem/accounts";

const erc165InterfaceId = "0x01ffc9a7";
const erc721InterfaceId = "0x80ac58cd";
const erc1155InterfaceId = "0xd9b67a26";

const ERC165_ABI = parseAbi([
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
]);

const {
  authorPrivateKey,
  appPrivateKey,
  rpcUrl,
  chain,
  retrieveEstimatableHookFeeChannelId,
} = parseEnv();

/**
 * This example shows how to retrieve estimated fee for posting a comment to a channel with a fee estimatable hook.
 * This approach directly interacts with the FeeEstimatableHook contract instead of using the SDK helper.
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
  // STEP 2: Get fee estimation from the hook contract
  // ========================================

  // Directly call the hook contract to estimate the fee for posting a comment
  const feeEstimation = await getFeeEstimation({
    authorAddress: authorAccount.address,
    appAddress: appAccount.address,
    channelId: retrieveEstimatableHookFeeChannelId,
    publicClient,
  });

  console.log(
    "The estimated fee for posting a comment to the hook is:",
    feeEstimation,
  );

  // ========================================
  // STEP 3: Determine the fee token type
  // ========================================

  // Check what type of token the fee is paid in (native, ERC20, ERC721, or ERC1155)
  const feeType = await getFeeType({
    feeEstimation,
    publicClient,
  });

  console.log("The fee type is:", feeType);

  // ========================================
  // STEP 4: Calculate total fee including protocol fee
  // ========================================

  // Get the protocol's transaction fee percentage
  const { fee: transactionHookFee } = await getHookTransactionFee({
    readContract: publicClient.readContract,
  });

  // Calculate the total fee by adding the protocol fee to the hook fee
  // Formula: totalFee = hookFee / (1 - protocolFeePercentage)
  const totalFee =
    (feeEstimation.amount * 10000n) / BigInt(10000 - transactionHookFee);

  console.log(
    "The total fee for posting a comment:",
    totalFee,
    feeType,
    "token",
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
      fee: totalFee - 1n, // Intentionally insufficient fee
    });
  } catch (error) {
    postCommentError = error;
  }

  // Verify that the transaction failed as expected
  if (!postCommentError) {
    throw new Error("post comment should have failed");
  }

  console.log("post comment with not enough fee failed as expected");

  // ========================================
  // VERIFY STEP 3: Post comment with the calculated fee
  // ========================================

  // Now post the comment with the exact fee amount required
  console.log("posting comment with required fee...");
  await postComment({
    comment: addCommentData,
    appSignature,
    writeContract: walletClient.writeContract,
    fee: totalFee, // Use the calculated total fee
  });
  console.log("comment posted successfully!");
}

/**
 * Helper function to get fee estimation directly from the hook contract
 * This demonstrates the manual approach vs using the SDK helper
 */
async function getFeeEstimation<
  transport extends Transport,
  chain extends Chain | undefined = undefined,
  accountOrAddress extends Account | Address | undefined = undefined,
  rpcSchema extends RpcSchema | undefined = undefined,
>({
  authorAddress,
  appAddress,
  channelId = 0n,
  publicClient,
}: {
  authorAddress: Hex;
  appAddress: Hex;
  channelId?: bigint;
  publicClient: PublicClient<
    transport,
    chain,
    ParseAccount<accountOrAddress>,
    rpcSchema
  >;
}): Promise<HookFeeEstimation> {
  console.log(
    `Getting estimated fee for:\n`,
    `  Author address: ${authorAddress}\n`,
    `  App address: ${appAddress}\n`,
    `  Channel ID: ${channelId}`,
  );

  // Get channel information to find the hook contract address
  const channelInfo = await getChannel({
    channelId,
    readContract: publicClient.readContract,
  });

  if (!channelInfo.hook) {
    throw new Error("Channel does not have a hook");
  }

  console.log("Channel info: ", channelInfo);

  // Set expiration time to 30 seconds from now, this is a rough estimation of the arrival time of the comment.
  // Most hooks do not use the field to calculate the fee, but in case they do, these are required and potentially
  // the estimation can be off so be prepared for that (you may want to add buffer fee amount or retry logic)
  const eta = BigInt(Date.now() + 1000 * 30);

  // Create the comment data structure with all required fields
  const commentData: CommentData = {
    content: "Hello, world!", // The actual comment text
    targetUri: "https://example.com", // URL this comment is about
    commentType: 0, // Type of comment (0 = regular comment)
    authMethod: AuthorAuthMethod.DIRECT_TX, // Author will sign and send transaction directly
    channelId,
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000", // No parent (top-level comment)
    author: authorAddress, // Who is posting the comment
    app: appAddress, // Which app manages this channel
    createdAt: eta, // When comment was created
    updatedAt: eta, // When comment was last updated
  };

  // No additional metadata for this example
  const metadata = [];

  // Since we set authMethod to DIRECT_TX, the comment will be posted directly by the author
  const msgSender = authorAddress;

  console.log("Getting estimated fee for comment data: ", commentData);

  // Call the hook contract's estimateAddCommentFee function directly
  const feeEstimation = await publicClient.readContract({
    abi: BaseHookABI,
    address: channelInfo.hook,
    functionName: "estimateAddCommentFee",
    args: [commentData, metadata, msgSender],
  });

  console.log("Estimated fee struct: ", feeEstimation);

  return feeEstimation;
}

/**
 * Helper function to determine the type of token used for fees
 * Uses ERC-165 interface detection to identify token standards
 */
async function getFeeType<
  transport extends Transport,
  chain extends Chain | undefined = undefined,
  accountOrAddress extends Account | Address | undefined = undefined,
  rpcSchema extends RpcSchema | undefined = undefined,
>({
  feeEstimation,
  publicClient,
}: {
  feeEstimation: HookFeeEstimation;
  publicClient: PublicClient<
    transport,
    chain,
    ParseAccount<accountOrAddress>,
    rpcSchema
  >;
}): Promise<"native" | "erc20" | "erc721" | "erc1155"> {
  // Check if the fee is paid in the native token (ETH, MATIC, etc.)
  if (
    feeEstimation.asset.toLowerCase() === NATIVE_ASSET_ADDRESS.toLowerCase()
  ) {
    return "native";
  }

  try {
    // Check if the asset supports ERC-165 (interface detection standard)
    const isErc165 = await publicClient.readContract({
      abi: ERC165_ABI,
      address: feeEstimation.asset,
      functionName: "supportsInterface",
      args: [erc165InterfaceId],
    });

    if (!isErc165) {
      console.log(
        "asset supports erc165 but saying it is not an ERC165 contract, something is wrong with the contract",
      );
      throw new Error("unsupported asset");
    }

    // Check if it's an ERC-721 (NFT) token
    const isErc721 = await publicClient.readContract({
      abi: ERC165_ABI,
      address: feeEstimation.asset,
      functionName: "supportsInterface",
      args: [erc721InterfaceId],
    });

    if (isErc721) {
      return "erc721";
    }

    // Check if it's an ERC-1155 (multi-token) token
    const isErc1155 = await publicClient.readContract({
      abi: ERC165_ABI,
      address: feeEstimation.asset,
      functionName: "supportsInterface",
      args: [erc1155InterfaceId],
    });

    if (isErc1155) {
      return "erc1155";
    }

    // If it supports ERC-165 but not ERC-721 or ERC-1155, assume it's ERC-20
    return "erc20";
  } catch (error) {
    // If the contract call fails, it's likely an ERC-20 token without ERC-165 support
    if (error instanceof ContractFunctionExecutionError) {
      return "erc20";
    }
    throw error;
  }
}

// Execute the main function
main();
