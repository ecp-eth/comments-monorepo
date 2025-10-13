import { describe, it, beforeEach, expect, beforeAll } from "vitest";
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
import type { Hex } from "../../core/schemas.js";
import type { CreateCommentData } from "../schemas.js";
import { privateKeyToAccount } from "viem/accounts";
import {
  createMetadataEntry,
  createMetadataEntries,
  createCustomMetadataEntry,
  encodeNumberValue,
  convertContractToRecordFormat,
  decodeMetadataTypes,
  decodeMetadataValue,
  MetadataTypeValues,
} from "../metadata.js";
import type { MetadataEntry } from "../types.js";
import { deployContractsForTests } from "../../../scripts/test-helpers.js";
import { ANVIL_PORT_FOR_TESTS } from "../../../scripts/constants.js";

describe("comment", () => {
  let commentsAddress: Hex;

  beforeAll(() => {
    ({ commentsAddress } = deployContractsForTests());
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
    transport: http(`http://localhost:${ANVIL_PORT_FOR_TESTS}`),
    account,
    // test to see if edit comment reverting is caused by lower polling interval
    // my theory is that the polling interval is lowered but the total number of polling is unchanged
    // resulting total wait time (= pollingInterval * total number of polling) not enough for the comment
    // to be fully broadcasted
    // pollingInterval: 500,
  }).extend(publicActions);

  const appClient = createWalletClient({
    chain: anvil,
    transport: http(`http://localhost:${ANVIL_PORT_FOR_TESTS}`),
    account: appAccount,
    // pollingInterval: 500,
  }).extend(publicActions);

  const thirdPartyClient = createWalletClient({
    chain: anvil,
    transport: http(`http://localhost:${ANVIL_PORT_FOR_TESTS}`),
    account: thirdPartyAccount,
    // pollingInterval: 500,
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
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");
    });
  });

  describe("postCommentWithSig()", () => {
    let appSignature: Hex;
    let commentData: CreateCommentData;

    beforeEach(async () => {
      const approvalResult = await addApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress,
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
        commentsAddress,
      });

      appSignature = await appClient.signTypedData(typedData);
    });

    it("posts a comment with signatures", async () => {
      const result = await postCommentWithSig({
        comment: commentData,
        appSignature,
        writeContract: appClient.writeContract,
        commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");
    });

    it("posts a comment with author signature when no approval exists", async () => {
      const revokeApprovalResult = await revokeApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress,
      });

      await client.waitForTransactionReceipt({
        hash: revokeApprovalResult.txHash,
      });

      await revokeApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress,
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
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);
      const authorSignature = await client.signTypedData(typedData);

      const result = await postCommentWithSig({
        comment: commentData,
        appSignature,
        authorSignature,
        writeContract: appClient.writeContract,
        commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");
    });

    it("fails with invalid app signature", async () => {
      await expect(
        postCommentWithSig({
          comment: createCommentData({
            app: appAccount.address,
            author: account.address,
            content:
              "Test comment content different from the one in the signature",
            metadata: [],
            targetUri: "https://example.com",
          }),
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
        }),
      ).rejects.toThrow(ContractFunctionExecutionError);
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
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      expect(logs.length).toBeGreaterThan(0);
      commentId = logs[0]!.args.commentId;
    });

    it("gets a comment by ID", async () => {
      const result = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress,
      });

      expect(result.comment.author).toBe(account.address);
      expect(result.comment.content).toBe("Test comment content");
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
        commentsAddress,
      });

      expect(commentId.startsWith("0x")).toBe(true);
      expect(commentId.length).toBe(66);
    });
  });

  describe("deleteComment()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test comment content for deleteComment",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      expect(logs.length).toBeGreaterThan(0);
      commentId = logs[0]!.args.commentId;
    });

    it("deletes a comment as author", async () => {
      const result = await deleteComment({
        commentId,
        writeContract: client.writeContract,
        commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");
    });
  });

  describe("deleteCommentWithSig()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const approvalResult = await addApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress,
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
          commentsAddress,
        }),
      );

      const postResult = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: postResult.txHash,
      });

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      expect(logs.length).toBeGreaterThan(0);
      commentId = logs[0]!.args.commentId;
    });

    it("deletes a comment with signatures", async () => {
      const typedData = createDeleteCommentTypedData({
        commentId,
        chainId: anvil.id,
        author: account.address,
        app: appAccount.address,
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await deleteCommentWithSig({
        commentId,
        app: appAccount.address,
        deadline: typedData.message.deadline,
        appSignature,
        writeContract: appClient.writeContract,
        commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");
    });

    it("fails with invalid signatures", async () => {
      const typedData = createDeleteCommentTypedData({
        commentId,
        chainId: anvil.id,
        author: account.address,
        app: appAccount.address,
        commentsAddress,
      });

      await expect(
        deleteCommentWithSig({
          commentId,
          app: appAccount.address,
          deadline: typedData.message.deadline,
          appSignature: "0x1234", // Invalid signature
          writeContract: thirdPartyClient.writeContract,
          commentsAddress,
        }),
      ).rejects.toThrow(ContractFunctionExecutionError);
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
        commentsAddress,
      });

      expect(result.startsWith("0x")).toBe(true);
      expect(result.length).toBe(66);
    });
  });

  describe("getNonce()", () => {
    it("returns current nonce", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress,
      });

      expect(typeof nonce).toBe("bigint");
    });
  });

  describe("editComment()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test editComment",
        metadata: [],
        targetUri: "https://example.com",
      });

      const typedData = createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
        confirmations: 2,
      });

      expect(receipt.status).toBe("success");

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      expect(logs.length).toBeGreaterThan(0);
      commentId = logs[0]!.args.commentId;

      expect(commentId).toBeDefined();
    });

    it("edits a comment as author", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress,
      });
      const edit = createEditCommentData({
        app: appAccount.address,
        commentId,
        nonce,
        content: "Updated comment content",
        metadata: [
          createMetadataEntry("test", "bool", true),
          createMetadataEntry("updated", "bool", true),
        ],
      });

      const typedData = createEditCommentTypedData({
        author: account.address,
        edit,
        chainId: anvil.id,
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await editComment({
        edit,
        writeContract: client.writeContract,
        commentsAddress,
        appSignature,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: result.txHash,
        confirmations: 2,
      });

      expect(receipt.status).toBe("success");

      // Verify the comment was updated
      const updatedComment = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress,
      });

      expect(updatedComment.comment.content).toBe("Updated comment content");
    });
  });

  describe("editCommentWithSig()", () => {
    let commentId: Hex;

    beforeEach(async () => {
      const approvalResult = await addApproval({
        app: appAccount.address,
        writeContract: client.writeContract,
        commentsAddress,
      });

      await client.waitForTransactionReceipt({
        hash: approvalResult.txHash,
      });

      const commentData = createCommentData({
        author: account.address,
        app: appAccount.address,
        content: "Test editCommentWithSig",
        metadata: [],
        targetUri: "https://example.com",
      });

      const appSignature = await appClient.signTypedData(
        createCommentTypedData({
          chainId: anvil.id,
          commentData,
          commentsAddress,
        }),
      );

      const postResult = await postComment({
        comment: commentData,
        appSignature,
        writeContract: client.writeContract,
        commentsAddress,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: postResult.txHash,
      });

      expect(receipt.status).toBe("success");

      const logs = parseEventLogs({
        abi: CommentManagerABI,
        logs: receipt.logs,
        eventName: "CommentAdded",
      });

      expect(logs.length).toBeGreaterThan(0);
      commentId = logs[0]!.args.commentId;

      expect(commentId).toBeDefined();
    });

    it("edits a comment with signatures", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress,
      });

      const edit = createEditCommentData({
        app: appAccount.address,
        commentId,
        nonce,
        content: "Updated comment content",
        metadata: [
          createMetadataEntry("test", "bool", true),
          createMetadataEntry("updated", "bool", true),
        ],
      });

      const typedData = createEditCommentTypedData({
        author: account.address,
        chainId: anvil.id,
        edit,
        commentsAddress,
      });

      const appSignature = await appClient.signTypedData(typedData);

      const result = await editCommentWithSig({
        edit,
        appSignature,
        writeContract: appClient.writeContract,
        commentsAddress,
      });

      const receipt = await appClient.waitForTransactionReceipt({
        hash: result.txHash,
      });

      expect(receipt.status).toBe("success");

      // Verify the comment was updated
      const updatedComment = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress,
      });

      expect(updatedComment.comment.content).toBe("Updated comment content");
    });

    it("fails with invalid signatures", async () => {
      const nonce = await getNonce({
        author: account.address,
        app: appAccount.address,
        readContract: client.readContract,
        commentsAddress,
      });

      const edit = createEditCommentData({
        app: appAccount.address,
        commentId,
        nonce,
        content: "Updated comment content",
        metadata: [
          createMetadataEntry("test", "bool", true),
          createMetadataEntry("updated", "bool", true),
        ],
      });

      await expect(
        editCommentWithSig({
          edit,
          appSignature: "0x1234", // Invalid signature
          writeContract: thirdPartyClient.writeContract,
          commentsAddress,
        }),
      ).rejects.toThrow(ContractFunctionExecutionError);
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
        metadata: [
          createMetadataEntry("test", "bool", true),
          createMetadataEntry("updated", "bool", true),
        ],
      });

      const result = await getEditCommentHash({
        author: account.address,
        edit,
        readContract: client.readContract,
        commentsAddress,
      });

      expect(result.startsWith("0x")).toBe(true);
      expect(result.length).toBe(66);
    });
  });

  describe("metadata functionality", () => {
    // Helper function to get comment metadata since getComment doesn't include it
    async function getCommentWithMetadata(commentId: Hex) {
      const comment = await getComment({
        commentId,
        readContract: client.readContract,
        commentsAddress,
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
          commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
        });

        const receipt = await client.waitForTransactionReceipt({
          hash: result.txHash,
        });

        const logs = parseEventLogs({
          abi: CommentManagerABI,
          logs: receipt.logs,
          eventName: "CommentAdded",
        });

        expect(logs.length).toBeGreaterThan(0);
        const commentId = logs[0]!.args.commentId;

        // Retrieve the comment and verify metadata
        const retrievedComment = await getCommentWithMetadata(commentId);
        expect(retrievedComment.metadata.length).toBe(3);

        // Test decoding
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        expect(Object.keys(parsedMetadata).length).toBe(3);
        expect(parsedMetadata["string title"]?.key).toBe("title");
        expect(parsedMetadata["string title"]?.type).toBe("string");
        expect(parsedMetadata["string description"]?.key).toBe("description");
        expect(parsedMetadata["string description"]?.type).toBe("string");
        expect(parsedMetadata["string category"]?.key).toBe("category");
        expect(parsedMetadata["string category"]?.type).toBe("string");

        // **NEW: Validate that encoded values decode back to original values using ONLY derived on-chain data**
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = decodedEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "title") {
              expect(decodedValue).toBe(originalValues.title);
            } else if (originalKey === "description") {
              expect(decodedValue).toBe(originalValues.description);
            } else if (originalKey === "category") {
              expect(decodedValue).toBe(originalValues.category);
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
          commentsAddress,
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
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        expect(Object.keys(parsedMetadata).length).toBe(3);
        expect(parsedMetadata["bool isPublic"]?.key).toBe("isPublic");
        expect(parsedMetadata["bool isPublic"]?.type).toBe("bool");
        expect(parsedMetadata["bool isModerated"]?.key).toBe("isModerated");
        expect(parsedMetadata["bool isModerated"]?.type).toBe("bool");
        expect(parsedMetadata["bool isPinned"]?.key).toBe("isPinned");
        expect(parsedMetadata["bool isPinned"]?.type).toBe("bool");

        // **NEW: Validate that encoded boolean values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = decodedEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "isPublic") {
              expect(decodedValue).toBe(originalValues.isPublic);
            } else if (originalKey === "isModerated") {
              expect(decodedValue).toBe(originalValues.isModerated);
            } else if (originalKey === "isPinned") {
              expect(decodedValue).toBe(originalValues.isPinned);
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

        expect(retrievedComment.metadata.length).toBe(3);

        // Test decoding
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        expect(Object.keys(parsedMetadata).length).toBe(3);
        expect(parsedMetadata["uint256 score"]?.type).toBe("uint256");
        expect(parsedMetadata["uint256 score"]?.key).toBe("score");
        expect(parsedMetadata["uint256 timestamp"]?.type).toBe("uint256");
        expect(parsedMetadata["uint256 largeNumber"]?.type).toBe("uint256");

        // **NEW: Validate that encoded numeric values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = decodedEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            // Match the decoded value to the original using the decoded key
            if (originalKey === "score") {
              expect(decodedValue).toBe(BigInt(originalValues.score));
            } else if (originalKey === "timestamp") {
              expect(decodedValue).toBe(originalValues.timestamp);
            } else if (originalKey === "largeNumber") {
              expect(decodedValue).toBe(originalValues.largeNumber);
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
          commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
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

        expect(retrievedComment.metadata.length).toBe(5);

        // Test decoding
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        expect(Object.keys(parsedMetadata).length).toBe(5);
        expect(parsedMetadata["uint8 smallInt"]?.type).toBe("uint8");
        expect(parsedMetadata["uint16 mediumInt"]?.type).toBe("uint16");
        expect(parsedMetadata["uint32 regularInt"]?.type).toBe("uint32");
        expect(parsedMetadata["uint64 biggerInt"]?.type).toBe("uint64");
        expect(parsedMetadata["uint128 hugeInt"]?.type).toBe("uint128");
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
          commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
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

        expect(retrievedComment.metadata.length).toBe(2);

        // Test decoding
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        expect(Object.keys(parsedMetadata).length).toBe(2);
        expect(parsedMetadata["int256 signedInt"]?.type).toBe("int256");
        expect(parsedMetadata["int128 signedBig"]?.type).toBe("int128");
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
          commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
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

        expect(retrievedComment.metadata.length).toBe(2);

        // Test decoding
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        expect(Object.keys(parsedMetadata).length).toBe(2);
        expect(parsedMetadata["address contractAddress"]?.type).toBe("address");
        expect(parsedMetadata["address appAddress"]?.type).toBe("address");

        // **NEW: Validate that encoded address values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = decodedEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            expect(decodedValue).toBeTypeOf("string");

            // Match the decoded value to the original using the decoded key
            if (originalKey === "contractAddress") {
              expect((decodedValue as string).toLowerCase()).toBe(
                originalValues.contractAddress.toLowerCase(),
              );
            } else if (originalKey === "appAddress") {
              expect((decodedValue as string).toLowerCase()).toBe(
                originalValues.appAddress.toLowerCase(),
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
          commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
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

        expect(retrievedComment.metadata.length).toBe(2);

        // Test decoding
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        expect(Object.keys(parsedMetadata).length).toBe(2);
        expect(parsedMetadata["bytes32 hash"]?.type).toBe("bytes32");
        expect(parsedMetadata["bytes data"]?.type).toBe("bytes");

        // **NEW: Validate that encoded bytes values decode back to original values using ONLY derived on-chain data**
        // This simulates the real-world scenario where we don't have prior knowledge of the types
        for (const entry of retrievedComment.metadata) {
          const decodedInfo = decodedEngineeredMap[entry.key];

          if (decodedInfo) {
            // Use the decoded type information from on-chain data (not prior knowledge)
            const decodedValue = decodeMetadataValue(entry, decodedInfo.type);
            const originalKey = decodedInfo.key;

            expect(decodedValue).toBeTypeOf("string");

            // Match the decoded value to the original using the decoded key
            if (originalKey === "hash") {
              expect((decodedValue as string).toLowerCase()).toBe(
                originalValues.hash.toLowerCase(),
              );
            } else if (originalKey === "data") {
              expect((decodedValue as string).toLowerCase()).toBe(
                originalValues.data.toLowerCase(),
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
          commentsAddress,
        });

        const appSignature = await appClient.signTypedData(typedData);

        const result = await postComment({
          comment: commentData,
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
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
        expect(retrievedComment.metadata.length).toBe(14);

        // Test decoding
        const decodedEngineeredMap = decodeMetadataTypes(
          retrievedComment.metadata,
        );

        const parsedMetadata = convertContractToRecordFormat(
          retrievedComment.metadata,
          decodedEngineeredMap,
        );

        // Verify all types are correctly parsed from the key field
        expect(Object.keys(parsedMetadata).length).toBe(14);

        // Test each type was correctly reverse-engineered
        expect(parsedMetadata["string title"]?.type).toBe("string");
        expect(parsedMetadata["string title"]?.key).toBe("title");
        expect(parsedMetadata["bool isActive"]?.type).toBe("bool");
        expect(parsedMetadata["bool isActive"]?.key).toBe("isActive");
        expect(parsedMetadata["uint256 score"]?.type).toBe("uint256");
        expect(parsedMetadata["uint256 score"]?.key).toBe("score");
        expect(parsedMetadata["uint8 level"]?.type).toBe("uint8");
        expect(parsedMetadata["uint8 level"]?.key).toBe("level");
        expect(parsedMetadata["uint16 points"]?.type).toBe("uint16");
        expect(parsedMetadata["uint32 experience"]?.type).toBe("uint32");
        expect(parsedMetadata["uint64 timestamp"]?.type).toBe("uint64");
        expect(parsedMetadata["uint128 balance"]?.type).toBe("uint128");
        expect(parsedMetadata["int256 delta"]?.type).toBe("int256");
        expect(parsedMetadata["int128 offset"]?.type).toBe("int128");
        expect(parsedMetadata["address owner"]?.type).toBe("address");
        expect(parsedMetadata["bytes32 hash"]?.type).toBe("bytes32");
        expect(parsedMetadata["bytes data"]?.type).toBe("bytes");
        expect(parsedMetadata["string config"]?.type).toBe("string");

        // Test parsing WITHOUT keyTypeMap to demonstrate the limitations
        const fallbackParsed = convertContractToRecordFormat(
          retrievedComment.metadata,
        );

        // Should still create entries but with generic keys and bytes type
        expect(Object.keys(fallbackParsed).length).toBe(14);
        for (const entry of retrievedComment.metadata) {
          expect(fallbackParsed[entry.key]).toBeDefined();
          expect(fallbackParsed[entry.key]?.type).toBe(
            MetadataTypeValues.BYTES,
          );
          expect(fallbackParsed[entry.key]?.key).toBe(entry.key); // Uses hash as key
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
          const decodedInfo = decodedEngineeredMap[entry.key];

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
                expect(decodedValue).toBeTypeOf("string");
                // Address comparison (normalize case)
                expect((decodedValue as string).toLowerCase()).toBe(
                  expectedValue,
                );
              } else if (
                typeof expectedValue === "string" &&
                (originalKey === "hash" || originalKey === "data")
              ) {
                expect(decodedValue).toBeTypeOf("string");

                // Hex string comparison (normalize case)
                expect((decodedValue as string).toLowerCase()).toBe(
                  expectedValue.toLowerCase(),
                );
              } else if (typeof expectedValue === "object") {
                // JSON object comparison
                expect(decodedValue).toStrictEqual(expectedValue);
              } else {
                // Direct comparison for primitives and bigints
                expect(decodedValue).toBe(expectedValue);
              }
              decodedCount++;
            }
          }
        }

        // Ensure we successfully decoded all 14 metadata entries
        expect(decodedCount).toBe(14);
      });
    });
  });
});
