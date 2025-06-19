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
  createChannel,
  getChannel,
  channelExists,
  getChannelCreationFee,
  ownerOf,
  updateChannel,
  setChannelCreationFee,
  withdrawFees,
  updateCommentsContract,
  setBaseURI,
} from "../channel.js";
import { ChannelManagerABI } from "../../abis.js";
import { deployContracts } from "../../../scripts/test-helpers.js";
import type { Hex } from "../../core/schemas.js";

describe("channel", () => {
  let channelManagerAddress: Hex;

  before(async () => {
    channelManagerAddress = deployContracts().channelManagerAddress;
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

  async function resetFees() {
    const creationFee = await setChannelCreationFee({
      fee: parseEther("0.02"),
      writeContract: client.writeContract,
      channelManagerAddress,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: creationFee.txHash,
    });

    assert.equal(receipt.status, "success");
  }

  beforeEach(async () => {
    await resetFees();
  });

  describe("createChannel()", () => {
    it("fails on insufficient fee", async () => {
      await assert.rejects(
        () =>
          createChannel({
            name: "Test channel",
            writeContract: client.writeContract,
            channelManagerAddress,
          }),
        (err) => {
          assert.ok(
            err instanceof ContractFunctionExecutionError,
            "should be a ContractFunctionExecutionError",
          );
          assert.ok(
            err.message.includes("Error: InsufficientFee()"),
            "should include InsufficientFee",
          );

          return true;
        },
      );
    });

    it("creates channel", async () => {
      const channel = await createChannel({
        name: "Test channel",
        fee: parseEther("0.02"), // this is default , see ChannelManager.sol
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: channel.txHash,
      });

      assert.equal(receipt.status, "success");
    });
  });

  describe("getChannel()", () => {
    let channelId: bigint;

    beforeEach(async () => {
      const result = await createChannel({
        name: "Test channel getChannel",
        fee: parseEther("0.02"),
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      assert.ok(logs.length > 0, "ChannelCreated event should be found");

      channelId = logs[0]!.args.channelId;
    });

    it("gets channel", async () => {
      const channel = await getChannel({
        channelId,
        readContract: client.readContract,
        channelManagerAddress,
      });

      assert.deepEqual(channel, {
        name: "Test channel getChannel",
        description: undefined,
        metadata: undefined,
        hook: undefined,
        permissions: {
          onCommentAdd: false,
          onCommentDelete: false,
          onCommentEdit: false,
          onInitialize: false,
          onChannelUpdate: false,
          onCommentHookDataUpdate: false,
        },
      });
    });
  });

  describe("channelExists()", () => {
    it("default channel", async () => {
      assert.equal(
        await channelExists({
          channelId: 0n, // default channel id
          readContract: client.readContract,
          channelManagerAddress,
        }),
        true,
        "should return true for default channel id",
      );

      assert.equal(
        await channelExists({
          channelId: 10n,
          readContract: client.readContract,
          channelManagerAddress,
        }),
        false,
        "should return false for non-existent channel id",
      );
    });
  });

  describe("getChannelCreationFee()", () => {
    it("returns the fee", async () => {
      const fee = await getChannelCreationFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      assert.deepEqual(
        fee,
        { fee: parseEther("0.02") },
        "should return default channel creation fee",
      );
    });
  });

  describe("ownerOf()", () => {
    let channelId: bigint;

    beforeEach(async () => {
      const result = await createChannel({
        name: "Test channel ownerOf",
        fee: parseEther("0.02"),
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      assert.ok(logs.length > 0, "ChannelCreated event should be found");

      channelId = logs[0]!.args.channelId;
    });

    it("default channel", async () => {
      const owner = await ownerOf({
        channelId,
        readContract: client.readContract,
        channelManagerAddress,
      });

      assert.deepEqual(owner, { owner: account.address });
    });
  });

  describe("updateChannel()", () => {
    let channelId: bigint;

    beforeEach(async () => {
      const result = await createChannel({
        name: "Test channel updateChannel",
        fee: parseEther("0.02"),
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      assert.ok(logs.length > 0, "ChannelCreated event should be found");

      channelId = logs[0]!.args.channelId;
    });

    it("updates channel", async () => {
      const result = await updateChannel({
        channelId,
        name: "Updated channel",
        description: "New description",
        metadata: [],
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      // Verify the update
      const channel = await getChannel({
        channelId,
        readContract: client.readContract,
        channelManagerAddress,
      });

      assert.deepEqual(channel, {
        name: "Updated channel",
        description: "New description",
        metadata: undefined,
        hook: undefined,
        permissions: {
          onCommentAdd: false,
          onCommentDelete: false,
          onCommentEdit: false,
          onInitialize: false,
          onChannelUpdate: false,
          onCommentHookDataUpdate: false,
        },
      });
    });
  });

  describe("setChannelCreationFee()", () => {
    it("fails if the account is not an owner", async () => {
      await assert.rejects(
        () =>
          setChannelCreationFee({
            fee: parseEther("0.05"),
            writeContract: client2.writeContract,
            channelManagerAddress,
          }),
        (err: unknown) => {
          const error = err as ContractFunctionExecutionError;
          assert.ok(err instanceof ContractFunctionExecutionError);
          assert.ok(error.message.includes("Error: Unauthorized()"));
          return true;
        },
      );
    });

    it("sets new fee", async () => {
      const newFee = parseEther("0.05");
      const result = await setChannelCreationFee({
        fee: newFee,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      // Verify the new fee
      const fee = await getChannelCreationFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      assert.deepEqual(fee, { fee: newFee });
    });
  });

  describe("withdrawFees()", () => {
    beforeEach(async () => {
      // Create a channel to generate some fees
      await createChannel({
        name: "Fee generation channel",
        fee: parseEther("0.02"),
        writeContract: client.writeContract,
        channelManagerAddress,
      });
    });

    it("withdraws fees", async () => {
      const result = await withdrawFees({
        recipient: account.address,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "FeesWithdrawn",
      });

      assert.ok(logs.length > 0, "FeesWithdrawn event should be found");
    });
  });

  describe("updateCommentsContract()", () => {
    it("updates comments contract", async () => {
      const newContractAddress = "0x1234567890123456789012345678901234567890";
      const result = await updateCommentsContract({
        commentsContract: newContractAddress,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });
  });

  describe("setBaseURI()", () => {
    it("sets base URI", async () => {
      const newBaseURI = "https://api.example.com/metadata/";
      const result = await setBaseURI({
        baseURI: newBaseURI,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });
  });
});
