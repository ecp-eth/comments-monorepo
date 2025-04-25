import { describe, it, beforeEach } from "node:test";
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
  getHookStatus,
  setHook,
  registerHook,
  setHookGloballyEnabled,
  getHookRegistrationFee,
  setHookRegistrationFee,
  getHookTransactionFee,
  setHookTransactionFee,
} from "../hook.js";
import { createChannel } from "../channel.js";
import { ChannelManagerAbi } from "../../abis.js";
import {
  CHANNEL_MANAGER_ADDRESS,
  NOOP_HOOK_ADDRESS,
} from "../../../scripts/constants.js";

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

// Test hook address
const TEST_HOOK_ADDRESS = "0x1234567890123456789012345678901234567890";

describe("getHookStatus()", () => {
  it("returns hook status for unregistered hook", async () => {
    const status = await getHookStatus({
      hookAddress: TEST_HOOK_ADDRESS,
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.deepEqual(
      status,
      { registered: false, enabled: false },
      "unregistered hook should return false for both registered and enabled"
    );
  });
});

describe("registerHook()", () => {
  it("registers a new hook", async () => {
    const result = await registerHook({
      hookAddress: NOOP_HOOK_ADDRESS,
      writeContract: client.writeContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
      fee: parseEther("0.02"),
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    const status = await getHookStatus({
      hookAddress: NOOP_HOOK_ADDRESS,
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.equal(status.registered, true, "hook should be registered");
  });

  it("fails if hook is already registered", async () => {
    await assert.rejects(
      () =>
        registerHook({
          hookAddress: NOOP_HOOK_ADDRESS,
          writeContract: client.writeContract,
          channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
          fee: parseEther("0.02"),
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        assert.ok(err.message.includes("Error: HookAlreadyRegistered()"));
        return true;
      }
    );
  });
});

describe("setHook()", () => {
  let channelId: bigint;

  beforeEach(async () => {
    const result = await createChannel({
      name: "Test channel",
      fee: parseEther("0.02"),
      writeContract: client.writeContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    const logs = parseEventLogs({
      abi: ChannelManagerAbi,
      logs: receipt.logs,
      eventName: "ChannelCreated",
    });

    assert.ok(logs.length > 0, "ChannelCreated event should be found");
    channelId = logs[0]!.args.channelId;
  });

  it("sets hook for a channel", async () => {
    const result = await setHook({
      channelId,
      hook: NOOP_HOOK_ADDRESS,
      writeContract: client.writeContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
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
          channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        assert.ok(err.message.includes("Error: HookNotRegistered()"));
        return true;
      }
    );
  });
});

describe("setHookGloballyEnabled()", () => {
  it("enables / disables hook globally", async () => {
    let result = await setHookGloballyEnabled({
      hookAddress: NOOP_HOOK_ADDRESS,
      enabled: true,
      writeContract: client.writeContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    let receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify the hook is enabled
    let status = await getHookStatus({
      hookAddress: NOOP_HOOK_ADDRESS,
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.equal(status.enabled, true, "hook should be enabled");

    result = await setHookGloballyEnabled({
      hookAddress: NOOP_HOOK_ADDRESS,
      enabled: false,
      writeContract: client.writeContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify the hook is disabled
    status = await getHookStatus({
      hookAddress: NOOP_HOOK_ADDRESS,
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.equal(status.enabled, false, "hook should be disabled");
  });
});

describe("getHookRegistrationFee()", () => {
  it("returns the registration fee", async () => {
    const result = await getHookRegistrationFee({
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.ok(typeof result.fee === "bigint", "fee should be a bigint");
  });
});

describe("setHookRegistrationFee()", () => {
  it("sets new registration fee", async () => {
    const newFee = parseEther("0.1");
    const result = await setHookRegistrationFee({
      fee: newFee,
      writeContract: client.writeContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify the new fee
    const fee = await getHookRegistrationFee({
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.equal(fee.fee, newFee);
  });

  it("fails if caller is not owner", async () => {
    await assert.rejects(
      () =>
        setHookRegistrationFee({
          fee: parseEther("0.1"),
          writeContract: client2.writeContract,
          channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        assert.ok(err.message.includes("Error: OwnableUnauthorizedAccount("));
        return true;
      }
    );
  });
});

describe("getHookTransactionFee()", () => {
  it("returns the transaction fee", async () => {
    const result = await getHookTransactionFee({
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.ok(
      typeof result.fee === "number",
      "fee should be a number (basis points)"
    );
  });
});

describe("setHookTransactionFee()", () => {
  it("sets new transaction fee", async () => {
    const newFeePercentage = 500; // 5%
    const result = await setHookTransactionFee({
      feePercentage: newFeePercentage,
      writeContract: client.writeContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify the new fee
    const fee = await getHookTransactionFee({
      readContract: client.readContract,
      channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
    });

    assert.equal(fee.fee, newFeePercentage);
  });

  it("fails if fee percentage is too high", async () => {
    await assert.rejects(
      () =>
        setHookTransactionFee({
          feePercentage: 10001, // More than 100%
          writeContract: client.writeContract,
          channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
        }),
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });

  it("fails if caller is not owner", async () => {
    await assert.rejects(
      () =>
        setHookTransactionFee({
          feePercentage: 500,
          writeContract: client2.writeContract,
          channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        assert.ok(err.message.includes("Error: OwnableUnauthorizedAccount("));
        return true;
      }
    );
  });
});
