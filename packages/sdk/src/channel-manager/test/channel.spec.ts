import { describe, it, beforeEach, expect, beforeAll } from "vitest";
import {
  createWalletClient,
  http,
  publicActions,
  parseEther,
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
  setCommentCreationFee,
  withdrawFees,
  setBaseURI,
  getCommentCreationFee,
  getEstimatedChannelPostCommentHookFee,
  getEstimatedChannelEditCommentHookFee,
  estimateChannelPostCommentFee,
} from "../channel.js";
import { ChannelManagerABI } from "../../abis.js";
import type { Hex } from "../../core/schemas.js";
import type { CommentData, MetadataEntry } from "../../comments/types.js";
import { AuthorAuthMethod } from "../../comments/types.js";
import { NATIVE_ASSET_ADDRESS } from "../../constants.js";
import { deployContracts } from "../../../scripts/test-helpers.js";

describe("channel", () => {
  let channelManagerAddress: Hex;
  let flatFeeHookAddress: Hex;
  let legacyTakeChannelFeeHookAddress: Hex;

  beforeAll(() => {
    ({
      channelManagerAddress,
      flatFeeHookAddress,
      legacyTakeChannelFeeHookAddress,
    } = deployContracts());
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
    pollingInterval: 500,
  }).extend(publicActions);

  const client2 = createWalletClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
    account: account2,
    pollingInterval: 500,
  }).extend(publicActions);

  async function resetFees() {
    const channelCreationFee = await setChannelCreationFee({
      fee: parseEther("0.02"),
      writeContract: client.writeContract,
      channelManagerAddress,
    });

    const channelCreationFeeReceipt = await client.waitForTransactionReceipt({
      hash: channelCreationFee.txHash,
    });

    expect(channelCreationFeeReceipt.status).toBe("success");

    const commentCreationFee = await setCommentCreationFee({
      fee: parseEther("0.00"),
      writeContract: client.writeContract,
      channelManagerAddress,
    });

    const commentCreationFeeReceipt = await client.waitForTransactionReceipt({
      hash: commentCreationFee.txHash,
    });

    expect(commentCreationFeeReceipt.status).toBe("success");
  }

  beforeEach(async () => {
    await resetFees();
  });

  describe("createChannel()", () => {
    it("fails on insufficient fee", async () => {
      await expect(
        createChannel({
          name: "Test channel",
          writeContract: client.writeContract,
          channelManagerAddress,
        }),
      ).rejects.toThrow(/Error: InsufficientFee\(\)/);
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

      expect(receipt.status).toBe("success");
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

      expect(receipt.status).toBe("success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      expect(logs.length > 0).toBe(true);

      channelId = logs[0]!.args.channelId;
    });

    it("gets channel", async () => {
      const channel = await getChannel({
        channelId,
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(channel).toStrictEqual({
        name: "Test channel getChannel",
        description: undefined,
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
      await expect(
        channelExists({
          channelId: 0n, // default channel id
          readContract: client.readContract,
          channelManagerAddress,
        }),
      ).resolves.toBe(true);

      await expect(
        channelExists({
          channelId: 10n,
          readContract: client.readContract,
          channelManagerAddress,
        }),
      ).resolves.toBe(false);
    });
  });

  describe("getChannelCreationFee()", () => {
    it("returns the fee", async () => {
      const fee = await getChannelCreationFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(fee).toStrictEqual({
        fee: parseEther("0.02"),
      });
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

      expect(receipt.status).toBe("success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      expect(logs.length > 0).toBe(true);

      channelId = logs[0]!.args.channelId;
    });

    it("default channel", async () => {
      const owner = await ownerOf({
        channelId,
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(owner).toStrictEqual({ owner: account.address });
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

      expect(receipt.status).toBe("success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      expect(logs.length > 0).toBe(true);

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

      expect(receipt.status).toBe("success");

      // Verify the update
      const channel = await getChannel({
        channelId,
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(channel).toStrictEqual({
        name: "Updated channel",
        description: "New description",
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
      await expect(
        setChannelCreationFee({
          fee: parseEther("0.05"),
          writeContract: client2.writeContract,
          channelManagerAddress,
        }),
      ).rejects.toThrow(/Error: Unauthorized\(\)/);
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

      expect(receipt.status).toBe("success");

      // Verify the new fee
      const fee = await getChannelCreationFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(fee).toStrictEqual({ fee: newFee });
    });
  });

  describe("getCommentCreationFee()", () => {
    it("returns the fee", async () => {
      const fee = await getCommentCreationFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(fee).toStrictEqual({
        fee: parseEther("0.00"),
      });
    });

    it("returns updated fee", async () => {
      const result = await setCommentCreationFee({
        fee: parseEther("0.05"),
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");

      const fee = await getCommentCreationFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(fee).toStrictEqual({
        fee: parseEther("0.05"),
      });
    });
  });

  describe("setCommentCreationFee()", () => {
    it("fails if the account is not an owner", async () => {
      await expect(
        setCommentCreationFee({
          fee: parseEther("0.03"),
          writeContract: client2.writeContract,
          channelManagerAddress,
        }),
      ).rejects.toThrow(/Error: Unauthorized\(\)/);
    });

    it("sets new fee", async () => {
      const newFee = parseEther("0.03");
      const result = await setCommentCreationFee({
        fee: newFee,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");

      // Verify the new fee
      const fee = await getCommentCreationFee({
        readContract: client.readContract,
        channelManagerAddress,
      });

      expect(fee).toStrictEqual({ fee: newFee });
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

      expect(receipt.status).toBe("success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "FeesWithdrawn",
      });

      expect(logs.length > 0).toBe(true);
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

      expect(receipt.status).toBe("success");
    });
  });

  describe("getEstimatedChannelPostCommentHookFee(), getEstimatedChannelEditCommentHookFee(), estimateChannelPostCommentFee(), estimateChannelEditCommentFee", () => {
    let channelId: bigint;
    let legacyTakeChannelId: bigint;

    async function createChannelWithHook(hookAddress: Hex) {
      const result = await createChannel({
        name: "Test channel for fee estimation" + Date.now(),
        fee: parseEther("0.02"),
        // flat fee hook address
        hook: hookAddress,
        writeContract: client.writeContract,
        channelManagerAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");

      const logs = parseEventLogs({
        abi: ChannelManagerABI,
        logs: receipt.logs,
        eventName: "ChannelCreated",
      });

      expect(logs.length > 0).toBe(true);

      return logs[0]!.args.channelId;
    }

    beforeEach(async () => {
      channelId = await createChannelWithHook(flatFeeHookAddress);
      legacyTakeChannelId = await createChannelWithHook(
        legacyTakeChannelFeeHookAddress,
      );
    });

    it("estimates the fee for posting a comment from hooks impelement IFeeEstimatable", async () => {
      const eta = BigInt(Math.floor(Date.now() / 1000)) + 30n;
      const commentData: CommentData = {
        content: "Hello, world!",
        targetUri: "https://example.com",
        commentType: 0,
        authMethod: AuthorAuthMethod.DIRECT_TX,
        channelId,
        parentId:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        author: account.address,
        app: account2.address,
        createdAt: eta,
        updatedAt: eta,
      };
      const metadata: MetadataEntry[] = [];
      // since we set authMethod to DIRECT_TX, the comment will be posted directly by the author
      const msgSender = account.address;

      const fee = await getEstimatedChannelPostCommentHookFee({
        readContract: client.readContract,
        channelId,
        commentData,
        metadata,
        msgSender,
        channelManagerAddress,
      });

      expect(fee.amount).toBe(900000000000000n);
      expect(fee.asset).toBe(NATIVE_ASSET_ADDRESS);
    });

    it("estimates the fee for editing a comment from hooks impelement IFeeEstimatable", async () => {
      const eta = BigInt(Math.floor(Date.now() / 1000)) + 30n;
      const commentData: CommentData = {
        content: "Hello, world!",
        targetUri: "https://example.com",
        commentType: 0,
        authMethod: AuthorAuthMethod.DIRECT_TX,
        channelId,
        parentId:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        author: account.address,
        app: account2.address,
        createdAt: eta,
        updatedAt: eta,
      };
      const metadata: MetadataEntry[] = [];
      // since we set authMethod to DIRECT_TX, the comment will be posted directly by the author
      const msgSender = account.address;

      const fee = await getEstimatedChannelEditCommentHookFee({
        readContract: client.readContract,
        channelId,
        commentData,
        metadata,
        msgSender,
        channelManagerAddress,
      });

      expect(fee.amount).toBe(900000000000000n);
      expect(fee.asset).toBe(NATIVE_ASSET_ADDRESS);
    });

    it("estimates the fee for posting a comment from legacy take channel fee hooks", async () => {
      const eta = BigInt(Math.floor(Date.now() / 1000)) + 30n;
      const commentData: CommentData = {
        content: "Hello, world!",
        targetUri: "https://example.com",
        commentType: 0,
        authMethod: AuthorAuthMethod.DIRECT_TX,
        channelId: legacyTakeChannelId,
        parentId:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        author: account.address,
        app: account2.address,
        createdAt: eta,
        updatedAt: eta,
      };
      const metadata: MetadataEntry[] = [];
      // since we set authMethod to DIRECT_TX, the comment will be posted directly by the author
      const msgSender = account.address;

      const fee = await getEstimatedChannelPostCommentHookFee({
        readContract: client.readContract,
        channelId: legacyTakeChannelId,
        commentData,
        metadata,
        msgSender,
        channelManagerAddress,
      });

      expect(fee.amount).toBe(100n);
      expect(fee.asset).toBe(NATIVE_ASSET_ADDRESS);

      const editFee = await getEstimatedChannelEditCommentHookFee({
        readContract: client.readContract,
        channelId: legacyTakeChannelId,
        commentData,
        metadata,
        msgSender,
        channelManagerAddress,
      });

      expect(editFee.amount).toBe(0n);
      expect(editFee.asset).toBe(NATIVE_ASSET_ADDRESS);

      const reactionData: CommentData = {
        content: "like",
        targetUri: "",
        commentType: 1,
        authMethod: AuthorAuthMethod.DIRECT_TX,
        channelId: legacyTakeChannelId,
        parentId:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        author: account.address,
        app: account2.address,
        createdAt: eta,
        updatedAt: eta,
      };

      const reactionFee = await getEstimatedChannelPostCommentHookFee({
        readContract: client.readContract,
        channelId: legacyTakeChannelId,
        commentData: reactionData,
        metadata,
        msgSender,
        channelManagerAddress,
      });

      expect(reactionFee.amount).toBe(0n);
      expect(reactionFee.asset).toBe(NATIVE_ASSET_ADDRESS);

      const estimatedTotalFee = await estimateChannelPostCommentFee({
        readContract: client.readContract,
        channelId: legacyTakeChannelId,
        commentData,
        metadata,
        msgSender,
        channelManagerAddress,
      });

      expect(estimatedTotalFee.baseToken.amount).toBe(102n);
    });
  });
});
