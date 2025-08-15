#!/usr/bin/env node --experimental-strip-types

import { type Hex, HexSchema } from "@ecp.eth/sdk/core";
import { createInterface } from "node:readline/promises";
import { type Chain, anvil, base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import z from "zod";
import { createWalletClient, http, publicActions } from "viem";
import { BroadcastHookABI } from "../src/abi/generated/broadcast-hook-abi.ts";

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

let broadcastContractAddress: `0x${string}`;
let rpcUrl: string = "http://localhost:8545";
let broadcastContractOwnerPrivateKey: Hex;
let chain: Chain;

const chainToUse = z
  .enum(["a", "b"])
  .parse(
    await readline.question(
      "Would you like to use anvil or base chain? (a/b)\n",
    ),
  );

if (chainToUse === "a") {
  chain = anvil;
} else {
  chain = base;
}

if (chain === base) {
  broadcastContractOwnerPrivateKey = HexSchema.parse(
    await readline.question(
      "Enter the private key for the broadcast contract owner on base chain: ",
    ),
  );

  rpcUrl = z
    .string()
    .url()
    .parse(await readline.question("Enter the rpc url for the base chain: "));

  const wantsDifferentBroadcastContractAddress = await readline.question(
    "Would you want to use different broadcast contract address than 0x0148e0a16170726d99ec419e54573251b2d274c8 on base chain? (y/n)\n",
  );

  if (wantsDifferentBroadcastContractAddress === "y") {
    broadcastContractAddress = HexSchema.parse(
      await readline.question("Enter the broadcast contract address: "),
    );
  } else {
    broadcastContractAddress = "0x0148e0a16170726d99ec419e54573251b2d274c8";
  }
} else {
  if (process.env.CUSTOM_ANVIL_DEPLOYER_PRIVATE_KEY) {
    console.info(
      "Using private key from CUSTOM_ANVIL_DEPLOYER_PRIVATE_KEY environment variable",
    );

    broadcastContractOwnerPrivateKey = HexSchema.parse(
      process.env.CUSTOM_ANVIL_DEPLOYER_PRIVATE_KEY,
    );
  } else {
    console.info("Using default private key from anvil");

    // default private key from anvil
    broadcastContractOwnerPrivateKey = HexSchema.parse(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
  }

  const wantsDifferentDeployerPrivateKey = await readline.question(
    "Would you want to use different private key for the broadcast contract owner on anvil? (y/n)\n",
  );

  if (wantsDifferentDeployerPrivateKey === "y") {
    broadcastContractOwnerPrivateKey = HexSchema.parse(
      await readline.question(
        "Enter the private key for the broadcast contract owner on anvil: ",
      ),
    );
  }

  const wantsDifferentBroadcastContractAddress = await readline.question(
    "Would you want to use different broadcast contract address than 0x35bBcd0f8b148F2D6e7344488A862fb45772c66b on anvil? (y/n)\n",
  );

  if (wantsDifferentBroadcastContractAddress === "y") {
    broadcastContractAddress = HexSchema.parse(
      await readline.question("Enter the broadcast contract address: "),
    );
  } else {
    broadcastContractAddress = "0x35bBcd0f8b148F2D6e7344488A862fb45772c66b";
  }
}

const accountToWhitelist = HexSchema.parse(
  await readline.question("Enter the account address to whitelist: "),
);

console.info("Whitelisting account", accountToWhitelist);

const broadcastContractOwnerAccount = privateKeyToAccount(
  broadcastContractOwnerPrivateKey,
);

console.info(
  "Broadcast contract owner address",
  broadcastContractOwnerAccount.address,
);

const walletClient = createWalletClient({
  account: broadcastContractOwnerAccount,
  chain,
  transport: http(rpcUrl),
}).extend(publicActions);

const tx = await walletClient.writeContract({
  address: broadcastContractAddress,
  abi: BroadcastHookABI,
  functionName: "setWhitelistStatus",
  args: [accountToWhitelist, true],
});

console.info(`Waiting for ${tx} to be mined...`);

const receipt = await walletClient.waitForTransactionReceipt({ hash: tx });

if (receipt.status === "success") {
  console.info("Transaction successful");

  process.exit(0);
} else {
  console.error("Transaction failed, see details below");
  console.error(receipt);

  process.exit(1);
}
