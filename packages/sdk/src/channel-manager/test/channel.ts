import test from "node:test";
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
  createChannel,
  getChannel,
  channelExists,
  getChannelCreationFee,
  getChannelOwner,
  updateChannel,
  setChannelCreationFee,
  withdrawFees,
  updateCommentsContract,
  setBaseURI,
} from "../channel.js";
import { ChannelManagerAbi } from "../../abis.js";

// Test account setup
const testPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil's first private key
const account = privateKeyToAccount(testPrivateKey);

// Create wallet client
const client = createWalletClient({
  chain: anvil,
  transport: http("http://localhost:8545"),
  account,
}).extend(publicActions);

test.describe("createChannel()", () => {
  test("fails on insufficient fee", async () => {
    await assert.rejects(
      () =>
        createChannel({
          name: "Test channel",
          writeContract: client.writeContract,
        }),
      (err) => {
        assert.ok(
          err instanceof ContractFunctionExecutionError,
          "should be a ContractFunctionExecutionError"
        );
        assert.ok(
          err.message.includes("Error: InsufficientFee()"),
          "should include InsufficientFee"
        );

        return true;
      }
    );
  });

  test("creates channel", async () => {
    const channel = await createChannel({
      name: "Test channel",
      fee: parseEther("0.02"), // this is default , see ChannelManager.sol
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: channel.txHash,
    });

    assert.equal(receipt.status, "success");
  });
});

test.describe("getChannel()", () => {
  let channelId: bigint;

  test.before(async () => {
    const result = await createChannel({
      name: "Test channel",
      fee: parseEther("0.02"),
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    const logs = parseEventLogs({
      abi: ChannelManagerAbi,
      logs: receipt.logs,
      eventName: "ChannelCreated",
    });

    assert.ok(logs.length > 0, "ChannelCreated event should be found");

    channelId = logs[0]!.args.channelId;
  });

  test("gets channel", async () => {
    const channel = await getChannel({
      channelId,
      readContract: client.readContract,
    });

    assert.deepEqual(channel, {
      name: "Test channel",
      description: undefined,
      metadata: undefined,
      hook: undefined,
    });
  });
});

test.describe("channelExists()", () => {
  test("default channel", async () => {
    assert.equal(
      await channelExists({
        channelId: 0n, // default channel id
        readContract: client.readContract,
      }),
      true,
      "should return true for default channel id"
    );

    assert.equal(
      await channelExists({
        channelId: 10n,
        readContract: client.readContract,
      }),
      false,
      "should return false for non-existent channel id"
    );
  });
});

test.describe("getChannelCreationFee()", () => {
  test("default channel", async () => {
    const fee = await getChannelCreationFee({
      readContract: client.readContract,
    });

    assert.deepEqual(
      fee,
      { fee: parseEther("0.02") },
      "should return default channel creation fee"
    );
  });
});

test.describe("getChannelOwner()", () => {
  let channelId: bigint;

  test.before(async () => {
    const result = await createChannel({
      name: "Test channel",
      fee: parseEther("0.02"),
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    const logs = parseEventLogs({
      abi: ChannelManagerAbi,
      logs: receipt.logs,
      eventName: "ChannelCreated",
    });

    assert.ok(logs.length > 0, "ChannelCreated event should be found");

    channelId = logs[0]!.args.channelId;
  });

  test("default channel", async () => {
    const owner = await getChannelOwner({
      channelId,
      readContract: client.readContract,
    });

    assert.deepEqual(owner, { owner: account.address });
  });
});

test.describe("updateChannel()", () => {
  let channelId: bigint;

  test.before(async () => {
    const result = await createChannel({
      name: "Test channel",
      fee: parseEther("0.02"),
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    const logs = parseEventLogs({
      abi: ChannelManagerAbi,
      logs: receipt.logs,
      eventName: "ChannelCreated",
    });

    assert.ok(logs.length > 0, "ChannelCreated event should be found");

    channelId = logs[0]!.args.channelId;
  });

  test("updates channel", async () => {
    const result = await updateChannel({
      channelId,
      name: "Updated channel",
      description: "New description",
      metadata: "New metadata",
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify the update
    const channel = await getChannel({
      channelId,
      readContract: client.readContract,
    });

    assert.deepEqual(channel, {
      name: "Updated channel",
      description: "New description",
      metadata: "New metadata",
      hook: undefined,
    });
  });
});

test.describe("setChannelCreationFee()", () => {
  test("fails if the account is not an owner", async () => {
    await assert.rejects(
      () =>
        setChannelCreationFee({
          fee: parseEther("0.05"),
          writeContract: client.writeContract,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        assert.ok(err.message.includes("Error: OwnableUnauthorizedAccount("));
        return true;
      }
    );
  });

  test("sets new fee", async () => {
    const newFee = parseEther("0.05");
    const result = await setChannelCreationFee({
      fee: newFee,
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify the new fee
    const fee = await getChannelCreationFee({
      readContract: client.readContract,
    });

    assert.deepEqual(fee, { fee: newFee });
  });
});

test.describe("withdrawFees()", () => {
  test.before(async () => {
    // Create a channel to generate some fees
    await createChannel({
      name: "Fee generation channel",
      fee: parseEther("0.02"),
      writeContract: client.writeContract,
    });
  });

  test("withdraws fees", async () => {
    const result = await withdrawFees({
      recipient: account.address,
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });
});

test.describe("updateCommentsContract()", () => {
  test("updates comments contract", async () => {
    const newContractAddress = "0x1234567890123456789012345678901234567890";
    const result = await updateCommentsContract({
      commentsContract: newContractAddress,
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });
});

test.describe("setBaseURI()", () => {
  test("sets base URI", async () => {
    const newBaseURI = "https://api.example.com/metadata/";
    const result = await setBaseURI({
      baseURI: newBaseURI,
      writeContract: client.writeContract,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });
});
