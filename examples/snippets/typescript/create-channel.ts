import {
  createChannel,
  getChannelCreationFee,
} from "@ecp.eth/sdk/channel-manager";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { parseEnv } from "./util";
import {
  createMetadataEntry,
  MetadataTypeValues,
} from "@ecp.eth/sdk/comments/metadata";

const { authorPrivateKey, rpcUrl, chain, createChannelHookAddress } =
  parseEnv();

/**
 * This example shows how to create a channel.
 */
async function main() {
  console.log(`running with hook address: ${createChannelHookAddress}`);

  // Initialize account, ensure the account has enough balance to pay for the channel creation fee
  const account = privateKeyToAccount(authorPrivateKey);

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
    const { txHash, wait } = await createChannel({
      name: "Ethereum Comments Protocol Updates",
      description:
        "Latest updates and announcements from the Ethereum Comments Protocol",
      metadata: [
        createMetadataEntry("category", MetadataTypeValues.STRING, "blog"),
        createMetadataEntry("rules", MetadataTypeValues.STRING, {
          list: ["Be respectful", "No spam"],
        }),
      ],
      hook: createChannelHookAddress, // No hook initially
      fee: fee,
      writeContract: walletClient.writeContract,
    });

    console.log("Channel creation transaction:", txHash);

    // Due to EVM limitations, return values from state-changing (write) contract calls are not propagated to off-chain callers directly,
    // For getting channel creation data, the SDK provides a `wait` method to wait for the transaction to be mined and return the event arguments.
    const createChannelEvent = await wait({
      getContractEvents: publicClient.getContractEvents,
      waitForTransactionReceipt: publicClient.waitForTransactionReceipt,
    });

    if (!createChannelEvent) {
      throw new Error("Channel creation event not found");
    }

    console.log("Channel created, id:", createChannelEvent.channelId);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
