import {
  createChannel,
  getChannelCreationFee,
} from "@ecp.eth/sdk/channel-manager";
import { CHANNEL_MANAGER_ADDRESS } from "@ecp.eth/sdk";
import { ChannelManagerABI } from "@ecp.eth/sdk/abis";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { parseEnv } from "./util";

const { privateKey, rpcUrl, chain } = parseEnv();

async function main() {
  // Initialize account, ensure the account has enough balance to pay for the channel creation fee
  const account = privateKeyToAccount(privateKey);

  // public client for read only operations
  const publicClient = createPublicClient({
    chain: chain,
    transport: http(rpcUrl),
  });

  // wallet client for write operations
  const walletClient = createWalletClient({
    account,
    chain: chain,
    transport: http(rpcUrl),
  });

  try {
    // Get the current channel creation fee
    const { fee } = await getChannelCreationFee({
      readContract: publicClient.readContract,
    });

    console.log("Channel creation fee:", fee.toString());

    // Create a new channel
    const { txHash } = await createChannel({
      name: "Ethereum Comments Protocol Updates",
      description:
        "Latest updates and announcements from the Ethereum Comments Protocol",
      metadata: JSON.stringify({
        category: "blog",
        rules: ["Be respectful", "No spam"],
      }),
      hook: "0x0000000000000000000000000000000000000000", // No hook initially
      fee: fee,
      writeContract: walletClient.writeContract,
    });

    console.log("Channel creation transaction:", txHash);

    // Wait for transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // Due to EVM limitations,
    // return values from state-changing (write) contract calls are not propagated to off-chain callers,
    // Hence we need to get the channel id from the event logs.
    const events = await publicClient.getContractEvents({
      address: CHANNEL_MANAGER_ADDRESS,
      abi: ChannelManagerABI,
      eventName: "ChannelCreated",
      // search for the event in the block that the transaction was mined in
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    let channelId: bigint | undefined;

    for (const event of events) {
      if (
        event.eventName === "ChannelCreated" &&
        event.transactionHash === txHash
      ) {
        channelId = event.args.channelId;

        return;
      }
    }

    if (!channelId) {
      throw new Error("Channel id not found");
    }

    console.log("Channel created, id:", channelId);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
