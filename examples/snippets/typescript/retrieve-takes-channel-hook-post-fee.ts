/**
 * !!!!!!!!!!!!!!!!!
 * !!! ATTENTION !!!
 * !!!!!!!!!!!!!!!!!
 *
 * Please note this snippet demonstrates manually calculating the total fee.
 * We have implemented a generic helper in the SDK that consolidates the fee retrieval logic.
 * Please refer to the [protocol-fee](https://docs.ethcomments.xyz/protocol-fee) for more details.
 *
 * To run this example, please make sure:
 * 1. .env is setup to correctly to use base mainnet
 * 2. build sdk in prod mode
 */

import {
  getChannel,
  getCommentCreationFee,
} from "@ecp.eth/sdk/channel-manager";
import { getHookTransactionFee } from "@ecp.eth/sdk/channel-manager/hook";
import {
  ContractFunctionExecutionError,
  createPublicClient,
  http,
  parseAbi,
} from "viem";
import { parseEnv } from "./util";
import { Hex } from "@ecp.eth/sdk/core/schemas";

const { rpcUrl, chain } = parseEnv();

const takesChannelId =
  100064447330177747350044095239722510184749233458465089218694126728903048799819n;

const takesChannelHookCommentFeeABI = parseAbi([
  "function commentFee() view returns (uint256)",
]);

const flatFeeHookCommentFeeABI = parseAbi([
  "function HOOK_FEE() view returns (uint256)",
]);

/**
 * This example shows how to retrieve the total posting fee for posting a comment to "Takes" channel used by interfaces.social.
 */
async function main() {
  // public client for read only operations
  const publicClient = createPublicClient({
    chain: chain,
    transport: http(rpcUrl),
  });

  async function getFeeRequiredByHook(hookAddress: Hex): Promise<bigint> {
    let feeRequiredByHook: bigint | undefined;

    try {
      console.log("Reading takes channel hook comment fee");
      const hookCommentFee = await publicClient.readContract({
        abi: takesChannelHookCommentFeeABI,
        address: hookAddress,
        functionName: "commentFee",
      });

      feeRequiredByHook = hookCommentFee;
    } catch (error) {
      if (!(error instanceof ContractFunctionExecutionError)) {
        console.log("Hook read error:", error);
        throw error;
      }
    }

    if (feeRequiredByHook) {
      return feeRequiredByHook;
    }

    try {
      console.log("Reading flat fee hook comment fee");
      const hookCommentFee = await publicClient.readContract({
        abi: flatFeeHookCommentFeeABI,
        address: hookAddress,
        functionName: "HOOK_FEE",
      });

      feeRequiredByHook = hookCommentFee;
    } catch (error) {
      if (!(error instanceof ContractFunctionExecutionError)) {
        console.log("Hook read error:", error);
        throw error;
      }
    }

    if (feeRequiredByHook) {
      return feeRequiredByHook;
    }

    console.warn("Unknown hook, cannot figure out the fee, use 0n as fallback");

    return 0n;
  }

  async function getTotalPostingFee(channelId: bigint) {
    let totalFee = 0n;

    const { fee: commentCreationFee } = await getCommentCreationFee({
      readContract: publicClient.readContract,
    });

    console.log("Comment creation fee:", commentCreationFee);

    totalFee += commentCreationFee;

    // Get the current channel creation fee
    const channel = await getChannel({
      channelId,
      readContract: publicClient.readContract,
    });

    console.log("Channel:", channel);

    if (!channel.hook) {
      console.log("No hook found on the channel");
      return totalFee;
    }

    let feeRequiredByHook = await getFeeRequiredByHook(channel.hook);

    console.log("Fee required by hook:", feeRequiredByHook);

    if (feeRequiredByHook <= 0n) {
      console.log("No fee required by hook");
      return totalFee;
    }

    const { fee: transactionHookFee } = await getHookTransactionFee({
      readContract: publicClient.readContract,
    });

    console.log("Transaction hook fee:", transactionHookFee);

    totalFee +=
      (feeRequiredByHook * 10000n) / BigInt(10000 - transactionHookFee);

    return totalFee;
  }

  try {
    const totalPostFee = await getTotalPostingFee(takesChannelId);

    console.log("Total post fee is", totalPostFee);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
