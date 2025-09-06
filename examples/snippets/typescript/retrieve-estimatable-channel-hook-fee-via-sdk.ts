/**
 * !!!!!!!!!!!!!!!!!
 * !!! ATTENTION !!!
 * !!!!!!!!!!!!!!!!!
 *
 * Please note this is a snippet for demostration of manually calculating the estimated fee via SDK.
 * We have implemented a generic helper function in the SDK to consolidate the fee retrieving logic.
 * Please refer to the [protocol-fee](https://docs.ethcomments.xyz/protocol-fee) for more details.
 */

import {
  Account,
  Address,
  Chain,
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
  FeeEstimation,
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
 * This example shows how to retrieve estimated fee for posting a comment to a channel implemented a fee estimatable hook.
 */
async function main() {
  // public client for read only operations
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  // Initialize account
  const authorAccount = privateKeyToAccount(authorPrivateKey);
  const appAccount = privateKeyToAccount(appPrivateKey);

  // wallet client for write operations
  const walletClient = createWalletClient({
    account: authorAccount,
    chain: chain,
    transport: http(rpcUrl),
  });

  const commentEta = BigInt(Date.now() + 1000 * 30);

  const commentData: CommentData = {
    content: "Hello, world!",
    targetUri: "https://example.com",
    commentType: 0,
    authMethod: AuthorAuthMethod.DIRECT_TX,
    channelId,
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    author: authorAddress,
    app: appAddress,
    createdAt: eta,
    updatedAt: eta,
  };
  const metadata = [];
  // since we set authMethod to DIRECT_TX, the comment will be posted directly by the author
  const msgSender = authorAddress;

  // const feeEstimation = await getFeeEstimation({
  //   authorAddress: authorAccount.address,
  //   appAddress: appAccount.address,
  //   channelId: retrieveEstimatableHookFeeChannelId,
  //   publicClient,
  // });

  console.log(
    "The estimated fee for posting a comment to the hook is:",
    feeEstimation,
  );

  const feeType = await getFeeType({
    feeEstimation,
    publicClient,
  });

  console.log("The fee type is:", feeType);

  const { fee: transactionHookFee } = await getHookTransactionFee({
    readContract: publicClient.readContract,
  });

  const totalFee =
    (feeEstimation.amount * 10000n) / BigInt(10000 - transactionHookFee);

  console.log(
    "The total fee for posting a comment:",
    totalFee,
    feeType,
    "token",
  );

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

  const typedCommentData = createCommentTypedData({
    commentData: addCommentData,
    chainId: chain.id,
  });

  const appSignature = await appAccount.signTypedData(typedCommentData);

  let postCommentError: unknown;

  // try to post the comment with the fee minus 1 to see if it reverts
  try {
    console.log("posting comment with not enough fee to see it fail...");
    await postComment({
      comment: addCommentData,
      appSignature,
      writeContract: walletClient.writeContract,
      fee: totalFee - 1n,
    });
  } catch (error) {
    postCommentError = error;
  }

  if (!postCommentError) {
    throw new Error("post comment should have failed");
  }

  console.log("post comment with not enough fee failed as expected");

  // now post the comment with the fee to see if it succeeds
  console.log("posting comment with required fee...");
  await postComment({
    comment: addCommentData,
    appSignature,
    writeContract: walletClient.writeContract,
    fee: totalFee,
  });
  console.log("comment posted!");
}

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
}): Promise<FeeEstimation> {
  console.log(
    `getting estimated fee for author address: ${authorAddress}\n`,
    `app address: ${appAddress}\n`,
    `channel id: ${channelId}`,
  );

  const channelInfo = await getChannel({
    channelId,
    readContract: publicClient.readContract,
  });

  if (!channelInfo.hook) {
    throw new Error("channel does not have a hook");
  }

  console.log("channel info: ", channelInfo);

  // Rough ETA of comment landing on chain
  const eta = BigInt(Date.now() + 1000 * 30);

  const commentData: CommentData = {
    content: "Hello, world!",
    targetUri: "https://example.com",
    commentType: 0,
    authMethod: AuthorAuthMethod.DIRECT_TX,
    channelId,
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    author: authorAddress,
    app: appAddress,
    createdAt: eta,
    updatedAt: eta,
  };
  const metadata = [];
  // since we set authMethod to DIRECT_TX, the comment will be posted directly by the author
  const msgSender = authorAddress;

  console.log("getting estimated fee for comment data: ", commentData);

  const feeEstimation = await publicClient.readContract({
    abi: BaseHookABI,
    address: channelInfo.hook,
    functionName: "estimateAddCommentFee",
    args: [commentData, metadata, msgSender],
  });

  console.log("estimated fee struct: ", feeEstimation);

  return feeEstimation;
}

async function getFeeType<
  transport extends Transport,
  chain extends Chain | undefined = undefined,
  accountOrAddress extends Account | Address | undefined = undefined,
  rpcSchema extends RpcSchema | undefined = undefined,
>({
  feeEstimation,
  publicClient,
}: {
  feeEstimation: FeeEstimation;
  publicClient: PublicClient<
    transport,
    chain,
    ParseAccount<accountOrAddress>,
    rpcSchema
  >;
}): Promise<"native" | "erc20" | "erc721" | "erc1155"> {
  if (
    feeEstimation.asset.toLowerCase() === NATIVE_ASSET_ADDRESS.toLowerCase()
  ) {
    return "native";
  }

  try {
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

    const isErc721 = await publicClient.readContract({
      abi: ERC165_ABI,
      address: feeEstimation.asset,
      functionName: "supportsInterface",
      args: [erc721InterfaceId],
    });

    if (isErc721) {
      return "erc721";
    }

    const isErc1155 = await publicClient.readContract({
      abi: ERC165_ABI,
      address: feeEstimation.asset,
      functionName: "supportsInterface",
      args: [erc1155InterfaceId],
    });

    if (isErc1155) {
      return "erc1155";
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("call revert exception")
    ) {
      return "erc20";
    }
    throw error;
  }

  console.log("unsupported asset");
  throw new Error("unsupported asset");
}

main();
