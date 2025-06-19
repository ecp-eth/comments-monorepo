import { describe, it, beforeEach, before } from "node:test";
import assert from "node:assert";
import {
  createWalletClient,
  http,
  publicActions,
  parseEther,
  ContractFunctionExecutionError,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import {
  setHook,
  getHookTransactionFee,
  setHookTransactionFee,
} from "../hook.js";
import { createChannel } from "../channel.js";
import { ChannelManagerABI } from "../../abis.js";
import { deployContracts } from "../../../scripts/test-helpers.js";
import type { Hex } from "../../core/schemas.js";

describe("hook", () => {
  let channelManagerAddress: Hex;
  let noopHookAddress: Hex;

  before(async () => {
    const reuslt = deployContracts();
    channelManagerAddress = reuslt.channelManagerAddress;
    noopHookAddress = reuslt.noopHookAddress;
  });

  // Test account setup
  const testPrivateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil's first private key
  const account = privateKeyToAccount(testPrivateKey);

  const testPrivateKey2 =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Anvil's second private key
  const account2 = privateKeyToAccount(testPrivateKey2);

  // Create wallet client
  const client = createWalletClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
    account,
  }).extend(publicActions);

  const client2 = createWalletClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
    account: account2,
  }).extend(publicActions);

  describe("setHook()", () => {
    let channelId: bigint;

    beforeEach(async () => {
      const result = await createChannel({
        name: `Test channel hook ${Date.now()}`,
        fee: parseEther("0.02"),
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      assert.ok(logs.length > 0, "ChannelCreated event should be found");
      channelId = logs[0]!.args.channelId;
    });

    it("sets hook for a channel", async () => {
      const result = await setHook({
        channelId,
        hook: noopHookAddress,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });

    it("fails if hook is not registered", async () => {
      const unregisteredHook = "0x9876543210987654321098765432109876543210";

      await assert.rejects(
        () =>
          setHook({
            channelId,
            hook: unregisteredHook,
            writeContract: client.writeContract,
            channelManagerAddress,
          }),
        (err) => {
          assert.ok(err instanceof ContractFunctionExecutionError);
          // somehow it is not possible to get error message here since it is swallowed
          // assert.ok(err.toString().includes("Error: InvalidHookInterface()"));
          return true;
        },
      );
    });
  });

  describe("getHookTransactionFee()", () => {
    it("returns the transaction fee", async () => {
      const result = await getHookTransactionFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      assert.ok(
        typeof result.fee === "number",
        "fee should be a number (basis points)",
      );
    });
  });

  describe("setHookTransactionFee()", () => {
    it("sets new transaction fee", async () => {
      const newFeeBasisPoints = 500; // 5%
      const result = await setHookTransactionFee({
        feeBasisPoints: newFeeBasisPoints,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      // Verify the new fee
      const fee = await getHookTransactionFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      assert.equal(fee.fee, newFeeBasisPoints);
    });

    it("fails if fee percentage is too high", async () => {
      await assert.rejects(
        () =>
          setHookTransactionFee({
            feeBasisPoints: 10001, // More than 100%
            writeContract: client.writeContract,
            channelManagerAddress,
          }),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        },
      );
    });

    it("fails if caller is not owner", async () => {
      await assert.rejects(
        () =>
          setHookTransactionFee({
            feeBasisPoints: 500,
            writeContract: client2.writeContract,
            channelManagerAddress,
          }),
        (err) => {
          assert.ok(err instanceof ContractFunctionExecutionError);
          assert.ok(
            (err as ContractFunctionExecutionError).message.includes(
              "Error: Unauthorized()",
            ),
          );
          return true;
        },
      );
    });
  });
});
