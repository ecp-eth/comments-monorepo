#!/usr/bin/env node --experimental-strip-types

/**
 * This script creates a channel on the broadcast hook contract.
 *
 * Usage:
 *
 * ```
 * ./create-channel.ts <name> <description> <optional-private-key default one of anvil private keys> <optional-rpc-url default anvil rpc> <optional-chain-id = default anvil>
 * ```
 *
 * Example:
 *
 * ```
 * ./create-channel.ts "My Channel" "My channel description"
 * ```
 */

import { createWalletClient, http, parseEther, publicActions } from "viem";
import { anvil, base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { BroadcastHookABI } from "../src/abi/generated/broadcast-hook-abi.ts";

/**
 * This is local address to the broadcast hook contract on anvil.
 */
const BROADCAST_HOOK_ADDRESS = "0x0148e0a16170726d99ec419e54573251b2d274c8";
const ANVIL_BROADCAST_HOOK_ADDRESS =
  "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";

const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ALLOWED_CHAINS = {
  [anvil.id]: anvil,
  [base.id]: base,
};

/**
 * This is the RPC URL for the local anvil node.
 */
const RPC_URL = "http://localhost:8545";

const [name, description, privateKey, rpcUrl, chainId] = z
  .tuple([
    z.string().nonempty("Please provide a non-empty title"),
    z.string().nonempty("Please provide a non-empty description"),
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
const account = privateKeyToAccount(privateKey as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl),
}).extend(publicActions);
const broadcastHookAddress =
  privateKey === ANVIL_PRIVATE_KEY
    ? ANVIL_BROADCAST_HOOK_ADDRESS
    : BROADCAST_HOOK_ADDRESS;

const txHash = await walletClient.writeContract({
  abi: BroadcastHookABI,
  address: broadcastHookAddress,
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
  address: broadcastHookAddress,
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
