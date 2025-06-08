import { describe, it, beforeEach, before } from "node:test";
import assert from "node:assert";
import {
  ContractFunctionExecutionError,
  createWalletClient,
  http,
  parseEventLogs,
  publicActions,
} from "viem";
import { anvil } from "viem/chains";
import {
  postComment,
  postCommentWithSig,
  getComment,
  getCommentId,
  deleteComment,
  deleteCommentWithSig,
  getDeleteCommentHash,
  getNonce,
  createCommentTypedData,
  createDeleteCommentTypedData,
  createCommentData,
  editCommentWithSig,
  editComment,
  createEditCommentTypedData,
  createEditCommentData,
  getEditCommentHash,
} from "../comment.js";
import { addApproval, revokeApproval } from "../approval.js";
import { CommentManagerABI } from "../../abis.js";
import { deployContracts } from "../../../scripts/test-helpers.js";
import type { Hex } from "../../core/schemas.js";
import type { CreateCommentData } from "../schemas.js";
import { privateKeyToAccount } from "viem/accounts";
import {
  createMetadataEntry,
  createMetadataEntries,
  createCustomMetadataEntry,
  createMetadataKey,
  encodeStringValue,
  encodeBoolValue,
  encodeNumberValue,
  encodeJsonValue,
  convertContractToRecordFormat,
  createKeyTypeMap,
  decodeMetadataTypes,
  decodeMetadataValue,
  decodeStringValue,
  decodeBoolValue,
  decodeNumberValue,
  decodeAddressValue,
  decodeBytesValue,
  type MetadataType,
  MetadataTypeValues,
} from "../metadata.js";
import type { MetadataEntry } from "../types.js";
import { hexToString } from "viem";

describe("comment", () => {
  let commentsAddress: Hex;

  before(async () => {
    commentsAddress = deployContracts().commentsAddress;
  });

  // Test account setup
  const testPrivateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil's first private key
  const account = privateKeyToAccount(testPrivateKey);

  const appPrivateKey =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Anvil's second private key
  const appAccount = privateKeyToAccount(appPrivateKey);

  const thirdPartyPrivateKey =
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; // Anvil's third private key
  const thirdPartyAccount = privateKeyToAccount(thirdPartyPrivateKey);

  // Create wallet client
  const client = createWalletClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
    account,
  }).extend(publicActions);

  const appClient = createWalletClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
    account: appAccount,
  }).extend(publicActions);

  const thirdPartyClient = createWalletClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
    account: thirdPartyAccount,
  }).extend(publicActions);

  describe("postComment()", () => {
    it("posts a comment as author", async () => {
      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });
  });

  describe("postCommentWithSig()", () => {
    let appSignature: Hex;
    let commentData: CreateCommentData;

    beforeEach(async () => {
      const approvalResult = await addApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      await client.waitForTransactionReceipt({
        hash: approvalResult.txHash,
      });

      commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress: commentsAddress,
      });

      appSignature = await appClient.signTypedData(typedData);
    });

    it("posts a comment with signatures", async () => {
      const result = await postCommentWithSig({
        comment: commentData,
        appSignature,
        writeContract: appClient.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });

    it("posts a comment with author signature when no approval exists", async () => {
      const revokeApprovalResult = await revokeApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      await client.waitForTransactionReceipt({
        hash: revokeApprovalResult.txHash,
      });

      await revokeApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);
      const authorSignature = await client.signTypedData(typedData);

      const result = await postCommentWithSig({
        comment: commentData,
        appSignature,
        authorSignature,
        writeContract: appClient.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });

    it("fails with invalid app signature", async () => {
      await assert.rejects(
        () =>
          postCommentWithSig({
            comment: createCommentData({
              app: appAccount.address,
              author: account.address,
              content: "Test comment content",
              metadata: [],
              targetUri: "https://example.com",
            }),
            appSignature,
            writeContract: client.writeContract,
            commentsAddress: commentsAddress,
          }),
        (err) => {
          assert.ok(err instanceof ContractFunctionExecutionError);
          return true;
        },
      );
    });
  });

  describe("getComment()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      assert.ok(logs.length > 0, "CommentAdded event should be found");
      commentId = logs[0]!.args.commentId;
    });

    it("gets a comment by ID", async () => {
      const result = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      assert.equal(result.comment.author, account.address);
      assert.equal(result.comment.content, "Test comment content");
    });
  });

  describe("getCommentId()", () => {
    it("returns comment ID", async () => {
      const commentId = await getCommentId({
        commentData: {
          app: appAccount.address,
          author: account.address,
          content: "Test comment content",
          metadata: [],
          targetUri: "https://example.com",
        },
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      assert.ok(commentId.startsWith("0x"), "should return a hex string");
      assert.equal(commentId.length, 66, "should be 32 bytes + 0x prefix");
    });
  });

  describe("deleteComment()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      assert.ok(logs.length > 0, "CommentAdded event should be found");
      commentId = logs[0]!.args.commentId;
    });

    it("deletes a comment as author", async () => {
      const result = await deleteComment({
        commentId,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });
  });

  describe("deleteCommentWithSig()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const approvalResult = await addApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      await client.waitForTransactionReceipt({
        hash: approvalResult.txHash,
      });

      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const appSignature = await appClient.signTypedData(
        createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        }),
      );

      const postResult = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: postResult.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      assert.ok(logs.length > 0, "CommentAdded event should be found");
      commentId = logs[0]!.args.commentId;
    });

    it("deletes a comment with signatures", async () => {
      const typedData = createDeleteCommentTypedData({
        commentId,
        chainId: anvil.id,
        author: account.address,
        app: appAccount.address,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await deleteCommentWithSig({
        commentId,
        app: appAccount.address,
        deadline: typedData.message.deadline,
        appSignature,
        writeContract: appClient.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");
    });

    it("fails with invalid signatures", async () => {
      const typedData = createDeleteCommentTypedData({
        commentId,
        chainId: anvil.id,
        author: account.address,
        app: appAccount.address,
        commentsAddress: commentsAddress,
      });

      await assert.rejects(
        () =>
          deleteCommentWithSig({
            commentId,
            app: appAccount.address,
            deadline: typedData.message.deadline,
            appSignature: "0x1234", // Invalid signature
            writeContract: thirdPartyClient.writeContract,
            commentsAddress: commentsAddress,
          }),
        (err) => {
          assert.ok(err instanceof ContractFunctionExecutionError);
          return true;
        },
      );
    });
  });

  describe("getDeleteCommentHash()", () => {
    it("returns hash for comment deletion", async () => {
      const result = await getDeleteCommentHash({
        commentId:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        author: account.address,
        app: appAccount.address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      assert.ok(result.startsWith("0x"), "should return a hex string");
      assert.equal(result.length, 66, "should be 32 bytes + 0x prefix");
    });
  });

  describe("getNonce()", () => {
    it("returns current nonce", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      assert.ok(typeof nonce === "bigint", "should return a bigint");
    });
  });

  describe("editComment()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      assert.ok(logs.length > 0, "CommentAdded event should be found");
      commentId = logs[0]!.args.commentId;
    });

    it("edits a comment as author", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });
      const edit = createEditCommentData({
        app: appAccount.address,
        commentId,
        nonce,
        content: "Updated comment content",
        metadataObject: { test: true, updated: true },
      });

      const typedData = createEditCommentTypedData({
        author: account.address,
        edit,
        chainId: anvil.id,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await editComment({
        edit,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
        appSignature,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      // Verify the comment was updated
      const updatedComment = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      assert.equal(updatedComment.comment.content, "Updated comment content");
    });
  });

  describe("editCommentWithSig()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const approvalResult = await addApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      await client.waitForTransactionReceipt({
        hash: approvalResult.txHash,
      });

      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content",
        metadata: [],
        targetUri: "https://example.com",
      });

      const appSignature = await appClient.signTypedData(
        createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        }),
      );

      const postResult = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: postResult.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      assert.ok(logs.length > 0, "CommentAdded event should be found");
      commentId = logs[0]!.args.commentId;
    });

    it("edits a comment with signatures", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      const edit = createEditCommentData({
        app: appAccount.address,
        commentId,
        nonce,
        content: "Updated comment content",
        metadataObject: { test: true, updated: true },
      });

      const typedData = createEditCommentTypedData({
        author: account.address,
        chainId: anvil.id,
        edit,
        commentsAddress: commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await editCommentWithSig({
        edit,
        appSignature,
        writeContract: appClient.writeContract,
        commentsAddress: commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      assert.equal(receipt.status, "success");

      // Verify the comment was updated
      const updatedComment = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      assert.equal(updatedComment.comment.content, "Updated comment content");
    });

    it("fails with invalid signatures", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      const edit = createEditCommentData({
        app: appAccount.address,
        commentId,
        nonce,
        content: "Updated comment content",
        metadataObject: { test: true, updated: true },
      });

      await assert.rejects(
        () =>
          editCommentWithSig({
            edit,
            appSignature: "0x1234", // Invalid signature
            writeContract: thirdPartyClient.writeContract,
            commentsAddress: commentsAddress,
          }),
        (err) => {
          assert.ok(err instanceof ContractFunctionExecutionError);
          return true;
        },
      );
    });
  });

  describe("getEditCommentHash()", () => {
    it("returns hash for comment edit", async () => {
      const edit = createEditCommentData({
        app: appAccount.address,
        commentId:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        nonce: 1n,
        content: "Updated comment content",
        metadataObject: { test: true, updated: true },
      });

      const result = await getEditCommentHash({
        author: account.address,
        edit,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      assert.ok(result.startsWith("0x"), "should return a hex string");
      assert.equal(result.length, 66, "should be 32 bytes + 0x prefix");
    });
  });

  describe("metadata functionality", () => {
    // Helper function to get comment metadata since getComment doesn't include it
    async function getCommentWithMetadata(commentId: Hex) {
      const comment = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress: commentsAddress,
      });

      const metadata = await client.readContract({
        address: commentsAddress,
        abi: CommentManagerABI,
        functionName: "getCommentMetadata",
        args: [commentId],
      });

      return {
        comment: comment.comment,
        metadata: metadata as MetadataEntry[],
      };
    }

    describe("string metadata", () => {
      it("creates and parses string metadata correctly", async () => {
        const originalValues = {
          title: "Test Title",
          description: "Test Description",
          category: "general",
        };

        const originalMetadata = {
          title: {
            type: MetadataTypeValues.STRING,
            value: originalValues.title,
          },
          description: {
            type: MetadataTypeValues.STRING,
            value: originalValues.description,
          },
          category: {
            type: MetadataTypeValues.STRING,
            value: originalValues.category,
          },
        };

        const metadataEntries = createMetadataEntries(originalMetadata);

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with string metadata",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        assert.ok(logs.length > 0, "CommentAdded event should be found");
        const commentId = logs[0]!.args.commentId;

        // Retrieve the comment and verify metadata
        const retrievedComment = await getCommentWithMetadata(commentId);
        assert.equal(retrievedComment.metadata.length, 3);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        assert.equal(Object.keys(parsedMetadata).length, 3);
        assert.equal(parsedMetadata["string title"]?.key, "title");
        assert.equal(parsedMetadata["string title"]?.type, "string");
        assert.equal(parsedMetadata["string description"]?.key, "description");
        assert.equal(parsedMetadata["string description"]?.type, "string");
        assert.equal(parsedMetadata["string category"]?.key, "category");
        assert.equal(parsedMetadata["string category"]?.type, "string");

        // **NEW: Validate that encoded values decode back to original values using ONLY derived on-chain data**
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = reverseEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "title") {
              assert.equal(
                decodedValue,
                originalValues.title,
                "Decoded title should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "description") {
              assert.equal(
                decodedValue,
                originalValues.description,
                "Decoded description should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "category") {
              assert.equal(
                decodedValue,
                originalValues.category,
                "Decoded category should match original (using only on-chain derived type)",
              );
            }
          }
        }
      });
    });

    describe("boolean metadata", () => {
      it("creates and parses boolean metadata correctly", async () => {
        const originalValues = {
          isPublic: true,
          isModerated: false,
          isPinned: true,
        };

        const metadataEntries = [
          createMetadataEntry(
            "isPublic",
            MetadataTypeValues.BOOL,
            originalValues.isPublic,
          ),
          createMetadataEntry(
            "isModerated",
            MetadataTypeValues.BOOL,
            originalValues.isModerated,
          ),
          createMetadataEntry(
            "isPinned",
            MetadataTypeValues.BOOL,
            originalValues.isPinned,
          ),
        ];

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with boolean metadata",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        const commentId = logs[0]!.args.commentId;
        const retrievedComment = await getCommentWithMetadata(commentId);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        assert.equal(Object.keys(parsedMetadata).length, 3);
        assert.equal(parsedMetadata["bool isPublic"]?.key, "isPublic");
        assert.equal(parsedMetadata["bool isPublic"]?.type, "bool");
        assert.equal(parsedMetadata["bool isModerated"]?.key, "isModerated");
        assert.equal(parsedMetadata["bool isModerated"]?.type, "bool");
        assert.equal(parsedMetadata["bool isPinned"]?.key, "isPinned");
        assert.equal(parsedMetadata["bool isPinned"]?.type, "bool");

        // **NEW: Validate that encoded boolean values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = reverseEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "isPublic") {
              assert.equal(
                decodedValue,
                originalValues.isPublic,
                "Decoded isPublic should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "isModerated") {
              assert.equal(
                decodedValue,
                originalValues.isModerated,
                "Decoded isModerated should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "isPinned") {
              assert.equal(
                decodedValue,
                originalValues.isPinned,
                "Decoded isPinned should match original (using only on-chain derived type)",
              );
            }
          }
        }
      });
    });

    describe("numeric metadata types", () => {
      it("creates and parses uint256 metadata correctly", async () => {
        const originalValues = {
          score: 42,
          timestamp: BigInt(Date.now()),
          largeNumber: 999999999999999999n,
        };

        const metadataEntries = [
          createMetadataEntry(
            "score",
            MetadataTypeValues.UINT256,
            originalValues.score,
          ),
          createMetadataEntry(
            "timestamp",
            MetadataTypeValues.UINT256,
            originalValues.timestamp,
          ),
          createMetadataEntry(
            "largeNumber",
            MetadataTypeValues.UINT256,
            originalValues.largeNumber,
          ),
        ];

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with uint256 metadata",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        const commentId = logs[0]!.args.commentId;
        const retrievedComment = await getCommentWithMetadata(commentId);

        assert.equal(retrievedComment.metadata.length, 3);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        assert.equal(Object.keys(parsedMetadata).length, 3);
        assert.equal(parsedMetadata["uint256 score"]?.type, "uint256");
        assert.equal(parsedMetadata["uint256 score"]?.key, "score");
        assert.equal(parsedMetadata["uint256 timestamp"]?.type, "uint256");
        assert.equal(parsedMetadata["uint256 largeNumber"]?.type, "uint256");

        // **NEW: Validate that encoded numeric values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = reverseEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "score") {
              assert.equal(
                decodedValue,
                BigInt(originalValues.score),
                "Decoded score should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "timestamp") {
              assert.equal(
                decodedValue,
                originalValues.timestamp,
                "Decoded timestamp should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "largeNumber") {
              assert.equal(
                decodedValue,
                originalValues.largeNumber,
                "Decoded largeNumber should match original (using only on-chain derived type)",
              );
            }
          }
        }
      });

      it("creates and parses smaller uint types correctly", async () => {
        const metadataEntries = [
          createCustomMetadataEntry(
            "smallInt",
            MetadataTypeValues.UINT8,
            encodeNumberValue(255),
          ),
          createCustomMetadataEntry(
            "mediumInt",
            MetadataTypeValues.UINT16,
            encodeNumberValue(65535),
          ),
          createCustomMetadataEntry(
            "regularInt",
            MetadataTypeValues.UINT32,
            encodeNumberValue(4294967295),
          ),
          createCustomMetadataEntry(
            "biggerInt",
            MetadataTypeValues.UINT64,
            encodeNumberValue(18446744073709551615n),
          ),
          createCustomMetadataEntry(
            "hugeInt",
            MetadataTypeValues.UINT128,
            encodeNumberValue(340282366920938463463374607431768211455n),
          ),
        ];

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with various uint types",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        const commentId = logs[0]!.args.commentId;
        const retrievedComment = await getCommentWithMetadata(commentId);

        assert.equal(retrievedComment.metadata.length, 5);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        assert.equal(Object.keys(parsedMetadata).length, 5);
        assert.equal(parsedMetadata["uint8 smallInt"]?.type, "uint8");
        assert.equal(parsedMetadata["uint16 mediumInt"]?.type, "uint16");
        assert.equal(parsedMetadata["uint32 regularInt"]?.type, "uint32");
        assert.equal(parsedMetadata["uint64 biggerInt"]?.type, "uint64");
        assert.equal(parsedMetadata["uint128 hugeInt"]?.type, "uint128");
      });

      it("creates and parses signed int types correctly", async () => {
        const metadataEntries = [
          createCustomMetadataEntry(
            "signedInt",
            MetadataTypeValues.INT256,
            encodeNumberValue(-42),
          ),
          createCustomMetadataEntry(
            "signedBig",
            MetadataTypeValues.INT128,
            encodeNumberValue(-123456789n),
          ),
        ];

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with signed int types",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        const commentId = logs[0]!.args.commentId;
        const retrievedComment = await getCommentWithMetadata(commentId);

        assert.equal(retrievedComment.metadata.length, 2);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        assert.equal(Object.keys(parsedMetadata).length, 2);
        assert.equal(parsedMetadata["int256 signedInt"]?.type, "int256");
        assert.equal(parsedMetadata["int128 signedBig"]?.type, "int128");
      });
    });

    describe("address and bytes metadata", () => {
      it("creates and parses address metadata correctly", async () => {
        const originalValues = {
          contractAddress: account.address,
          appAddress: appAccount.address,
        };

        const metadataEntries = [
          createCustomMetadataEntry(
            "contractAddress",
            MetadataTypeValues.ADDRESS,
            originalValues.contractAddress as Hex,
          ),
          createCustomMetadataEntry(
            "appAddress",
            MetadataTypeValues.ADDRESS,
            originalValues.appAddress as Hex,
          ),
        ];

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with address metadata",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        const commentId = logs[0]!.args.commentId;
        const retrievedComment = await getCommentWithMetadata(commentId);

        assert.equal(retrievedComment.metadata.length, 2);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        assert.equal(Object.keys(parsedMetadata).length, 2);
        assert.equal(
          parsedMetadata["address contractAddress"]?.type,
          "address",
        );
        assert.equal(parsedMetadata["address appAddress"]?.type, "address");

        // **NEW: Validate that encoded address values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = reverseEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "contractAddress") {
              assert.equal(
                decodedValue.toLowerCase(),
                originalValues.contractAddress.toLowerCase(),
                "Decoded contractAddress should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "appAddress") {
              assert.equal(
                decodedValue.toLowerCase(),
                originalValues.appAddress.toLowerCase(),
                "Decoded appAddress should match original (using only on-chain derived type)",
              );
            }
          }
        }
      });

      it("creates and parses bytes metadata correctly", async () => {
        const originalValues = {
          hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as Hex,
          data: "0x48656c6c6f20576f726c64" as Hex, // "Hello World" in hex
        };

        const metadataEntries = [
          createCustomMetadataEntry(
            "hash",
            MetadataTypeValues.BYTES32,
            originalValues.hash,
          ),
          createCustomMetadataEntry(
            "data",
            MetadataTypeValues.BYTES,
            originalValues.data,
          ),
        ];

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with bytes metadata",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        const commentId = logs[0]!.args.commentId;
        const retrievedComment = await getCommentWithMetadata(commentId);

        assert.equal(retrievedComment.metadata.length, 2);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        assert.equal(Object.keys(parsedMetadata).length, 2);
        assert.equal(parsedMetadata["bytes32 hash"]?.type, "bytes32");
        assert.equal(parsedMetadata["bytes data"]?.type, "bytes");

        // **NEW: Validate that encoded bytes values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = reverseEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "hash") {
              assert.equal(
                decodedValue.toLowerCase(),
                originalValues.hash.toLowerCase(),
                "Decoded hash should match original (using only on-chain derived type)",
              );
            } else if (originalKey === "data") {
              assert.equal(
                decodedValue.toLowerCase(),
                originalValues.data.toLowerCase(),
                "Decoded data should match original (using only on-chain derived type)",
              );
            }
          }
        }
      });
    });

    describe("mixed metadata types comprehensive test", () => {
      it("creates and parses all metadata types together", async () => {
        // Test ALL MetadataType variants
        const metadataEntries: MetadataEntry[] = [
          // String
          createMetadataEntry(
            "title",
            MetadataTypeValues.STRING,
            "Complete Test",
          ),
          // Boolean
          createMetadataEntry("isActive", MetadataTypeValues.BOOL, true),
          // Numbers - uint variants
          createMetadataEntry("score", MetadataTypeValues.UINT256, 42), // uint256
          createCustomMetadataEntry(
            "level",
            MetadataTypeValues.UINT8,
            encodeNumberValue(255),
          ),
          createCustomMetadataEntry(
            "points",
            MetadataTypeValues.UINT16,
            encodeNumberValue(65535),
          ),
          createCustomMetadataEntry(
            "experience",
            MetadataTypeValues.UINT32,
            encodeNumberValue(4294967295),
          ),
          createCustomMetadataEntry(
            "timestamp",
            MetadataTypeValues.UINT64,
            encodeNumberValue(18446744073709551615n),
          ),
          createCustomMetadataEntry(
            "balance",
            MetadataTypeValues.UINT128,
            encodeNumberValue(340282366920938463463374607431768211455n),
          ),
          // Signed integers
          createCustomMetadataEntry(
            "delta",
            MetadataTypeValues.INT256,
            encodeNumberValue(-42),
          ),
          createCustomMetadataEntry(
            "offset",
            MetadataTypeValues.INT128,
            encodeNumberValue(-123456789n),
          ),
          // Address
          createCustomMetadataEntry(
            "owner",
            MetadataTypeValues.ADDRESS,
            account.address as Hex,
          ),
          // Bytes
          createCustomMetadataEntry(
            "hash",
            MetadataTypeValues.BYTES32,
            "0x1234567890123456789012345678901234567890123456789012345678901234" as Hex,
          ),
          createCustomMetadataEntry(
            "data",
            MetadataTypeValues.BYTES,
            "0x48656c6c6f" as Hex,
          ),
          // JSON object (stored as string)
          createMetadataEntry("config", MetadataTypeValues.STRING, {
            theme: "dark",
            version: 1,
          }),
        ];

        const commentData = createCommentData({
          author: account.address,
          app: appAccount.address,
          content: "Test comment with ALL metadata types",
          metadata: metadataEntries,
          targetUri: "https://example.com",
        });

        const typedData = createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress: commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress: commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        const commentId = logs[0]!.args.commentId;
        const retrievedComment = await getCommentWithMetadata(commentId);

        // Should have all 14 metadata entries
        assert.equal(retrievedComment.metadata.length, 14);

        // Test decoding
        const reverseEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          reverseEngineeredMap,
        );

        // Verify all types are correctly parsed from the key field
        assert.equal(Object.keys(parsedMetadata).length, 14);

        // Test each type was correctly reverse-engineered
        assert.equal(parsedMetadata["string title"]?.type, "string");
        assert.equal(parsedMetadata["string title"]?.key, "title");
        assert.equal(parsedMetadata["bool isActive"]?.type, "bool");
        assert.equal(parsedMetadata["bool isActive"]?.key, "isActive");
        assert.equal(parsedMetadata["uint256 score"]?.type, "uint256");
        assert.equal(parsedMetadata["uint256 score"]?.key, "score");
        assert.equal(parsedMetadata["uint8 level"]?.type, "uint8");
        assert.equal(parsedMetadata["uint8 level"]?.key, "level");
        assert.equal(parsedMetadata["uint16 points"]?.type, "uint16");
        assert.equal(parsedMetadata["uint32 experience"]?.type, "uint32");
        assert.equal(parsedMetadata["uint64 timestamp"]?.type, "uint64");
        assert.equal(parsedMetadata["uint128 balance"]?.type, "uint128");
        assert.equal(parsedMetadata["int256 delta"]?.type, "int256");
        assert.equal(parsedMetadata["int128 offset"]?.type, "int128");
        assert.equal(parsedMetadata["address owner"]?.type, "address");
        assert.equal(parsedMetadata["bytes32 hash"]?.type, "bytes32");
        assert.equal(parsedMetadata["bytes data"]?.type, "bytes");
        assert.equal(parsedMetadata["string config"]?.type, "string");

        // Test parsing WITHOUT keyTypeMap to demonstrate the limitations
        const fallbackParsed = convertContractToRecordFormat(
          retrievedComment.metadata,
        );

        // Should still create entries but with generic keys and bytes type
        assert.equal(Object.keys(fallbackParsed).length, 14);
        for (const entry of retrievedComment.metadata) {
          assert.ok(fallbackParsed[entry.key]);
          assert.equal(
            fallbackParsed[entry.key]?.type,
            MetadataTypeValues.BYTES,
          );
          assert.equal(fallbackParsed[entry.key]?.key, entry.key); // Uses hash as key
        }

        // **NEW: Demonstrate TRUE zero-knowledge decoding - decode ALL values using ONLY on-chain derived information**
        // This proves the system can reconstruct original data from on-chain metadata without any prior knowledge
        const originalValues = {
          title: "Complete Test",
          isActive: true,
          score: 42n,
          level: 255n,
          points: 65535n,
          experience: 4294967295n,
          timestamp: 18446744073709551615n,
          balance: 340282366920938463463374607431768211455n,
          delta: -42n,
          offset: -123456789n,
          owner: account.address.toLowerCase(),
          hash: "0x1234567890123456789012345678901234567890123456789012345678901234",
          data: "0x48656c6c6f",
          config: { theme: "dark", version: 1 },
        };

        let decodedCount = 0;
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = reverseEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use ONLY the type information derived from on-chain data
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Validate against expected values based on the decoded key
            if (originalKey in originalValues) {
              const expectedValue =
                originalValues[originalKey as keyof typeof originalValues];

              if (
                typeof expectedValue === "string" &&
                originalKey === "owner"
              ) {
                // Address comparison (normalize case)
                assert.equal(
                  decodedValue.toLowerCase(),
                  expectedValue,
                  `Decoded ${originalKey} should match original (zero-knowledge decoding)`,
                );
              } else if (
                typeof expectedValue === "string" &&
                (originalKey === "hash" || originalKey === "data")
              ) {
                // Hex string comparison (normalize case)
                assert.equal(
                  decodedValue.toLowerCase(),
                  expectedValue.toLowerCase(),
                  `Decoded ${originalKey} should match original (zero-knowledge decoding)`,
                );
              } else if (typeof expectedValue === "object") {
                // JSON object comparison
                assert.deepEqual(
                  decodedValue,
                  expectedValue,
                  `Decoded ${originalKey} should match original (zero-knowledge decoding)`,
                );
              } else {
                // Direct comparison for primitives and bigints
                assert.equal(
                  decodedValue,
                  expectedValue,
                  `Decoded ${originalKey} should match original (zero-knowledge decoding)`,
                );
              }
              decodedCount++;
            }
          }
        }

        // Ensure we successfully decoded all 14 metadata entries
        assert.equal(
          decodedCount,
          14,
          "Should have successfully decoded all metadata entries using only on-chain derived information",
        );
      });
    });
  });
});
