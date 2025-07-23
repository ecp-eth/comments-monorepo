#!/usr/bin/env node --experimental-strip-types

/**
 * This script creates a channel on the broadcast hook contract.
 *
 * Usage:
 *
 * ```
 * ./create-channel.ts <private-key> <name> <description>
 * ```
 *
 * Example:
 *
 * ```
 * ./create-channel.ts 0x1234567890abcdef "My Channel" "My channel description"
 * ```
 */

import { createWalletClient, http, parseEther, publicActions } from "viem";
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { BroadcastHookABI } from "./abi/generated/broadcast-hook-abi.ts";

/**
 * This is local address to the broadcast hook contract on anvil.
 */
const BROADCAST_HOOK_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";

const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/**
 * This is the RPC URL for the local anvil node.
 */
const RPC_URL = "http://localhost:8545";

const [name, description] = z
  .tuple([
    z.string().nonempty("Please provide a non-empty title"),
    z.string().nonempty("Please provide a non-empty description"),
  ])
  .parse(process.argv.slice(2));

const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: anvil,
  transport: http(RPC_URL),
}).extend(publicActions);

const txHash = await walletClient.writeContract({
  abi: BroadcastHookABI,
  address: BROADCAST_HOOK_ADDRESS,
  functionName: "createChannel",
  args: [name, description, []],
  value: parseEther("0.02"), // 0.02 ETH for channel creation
});

console.log(`Waiting for transaction ${txHash} to be mined...`);

const receipt = await walletClient.waitForTransactionReceipt({
  hash: txHash,
});

if (receipt.status === "reverted") {
  console.error("Channel creation reverted");

  process.exit(1);
}

const events = await walletClient.getContractEvents({
  address: BROADCAST_HOOK_ADDRESS,
  abi: BroadcastHookABI,
  eventName: "ChannelCreated",
  fromBlock: receipt.blockNumber,
  toBlock: receipt.blockNumber,
});

events.forEach((event) => {
  if (event.args.channelId) {
    console.log(`Channel created with ID: ${event.args.channelId}`);
  }
});
