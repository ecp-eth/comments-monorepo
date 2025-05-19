import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  createWalletClient,
  http,
  publicActions,
  ContractFunctionExecutionError,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import {
  postCommentAsAuthor,
  postComment,
  getComment,
  getCommentId,
  deleteCommentAsAuthor,
  deleteComment,
  getDeleteCommentHash,
  getNonce,
  createCommentTypedData,
  createDeleteCommentTypedData,
  createCommentData,
  editComment,
  editCommentAsAuthor,
  createEditCommentTypedData,
  createEditCommentData,
  getEditCommentHash,
} from "../comment.js";
import { addApprovalAsAuthor, revokeApprovalAsAuthor } from "../approval.js";
import { CommentManagerABI } from "../../abis.js";
import { deployContracts } from "../../../scripts/test-helpers.js";
import type { Hex } from "../../core/schemas.js";
import type { CreateCommentData } from "../schemas.js";

const { commentsAddress } = deployContracts();

// Test account setup
const testPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil's first private key
const account = privateKeyToAccount(testPrivateKey);

const appPrivateKey =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Anvil's second private key
const appAccount = privateKeyToAccount(appPrivateKey);

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

describe("postCommentAsAuthor()", () => {
  it("posts a comment as author", async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);

    const result = await postCommentAsAuthor({
      comment: commentData,
      appSignature,
      writeContract: client.writeContract,
      commentsAddress,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });
});

describe("postComment()", () => {
  let appSignature: Hex;
  let commentData: CreateCommentData;

  beforeEach(async () => {
    const approvalResult = await addApprovalAsAuthor({
      app: appAccount.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: approvalResult.txHash,
    });

    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    appSignature = await appClient.signTypedData(typedData);
  });

  it("posts a comment with signatures", async () => {
    const result = await postComment({
      comment: commentData,
      appSignature,
      writeContract: appClient.writeContract,
      commentsAddress,
    });

    const receipt = await appClient.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });

  it("posts a comment with author signature when no approval exists", async () => {
    const revokeApprovalResult = await revokeApprovalAsAuthor({
      app: appAccount.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: revokeApprovalResult.txHash,
    });

    await revokeApprovalAsAuthor({
      app: appAccount.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    // Get a fresh nonce since we're not using the beforeEach setup
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);
    const authorSignature = await client.signTypedData(typedData);

    const result = await postComment({
      comment: commentData,
      appSignature,
      authorSignature,
      writeContract: appClient.writeContract,
      commentsAddress,
    });

    const receipt = await appClient.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });

  it("fails with invalid app signature", async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    await assert.rejects(
      () =>
        postComment({
          comment: createCommentData({
            app: appAccount.address,
            author: account.address,
            content: "Test comment content",
            metadata: { test: true },
            nonce,
            targetUri: "https://example.com",
          }),
          appSignature,
          writeContract: client.writeContract,
          commentsAddress,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        return true;
      }
    );
  });
});

describe("getComment()", () => {
  let commentId: Hex;

  beforeEach(async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);

    const result = await postCommentAsAuthor({
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

    assert.ok(logs.length > 0, "CommentAdded event should be found");
    commentId = logs[0]!.args.commentId;
  });

  it("gets a comment by ID", async () => {
    const result = await getComment({
      commentId,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.equal(result.comment.author, account.address);
    assert.equal(result.comment.content, "Test comment content");
  });
});

describe("getCommentId()", () => {
  it("returns comment ID", async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentId = await getCommentId({
      commentData: {
        app: appAccount.address,
        author: account.address,
        content: "Test comment content",
        metadata: { test: true },
        nonce,
        targetUri: "https://example.com",
      },
      readContract: client.readContract,
      commentsAddress,
    });

    assert.ok(commentId.startsWith("0x"), "should return a hex string");
    assert.equal(commentId.length, 66, "should be 32 bytes + 0x prefix");
  });
});

describe("deleteCommentAsAuthor()", () => {
  let commentId: Hex;

  beforeEach(async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      metadata: { test: true },
      nonce,
      targetUri: "https://example.com",
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);

    const result = await postCommentAsAuthor({
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

    assert.ok(logs.length > 0, "CommentAdded event should be found");
    commentId = logs[0]!.args.commentId;
  });

  it("deletes a comment as author", async () => {
    const result = await deleteCommentAsAuthor({
      commentId,
      writeContract: client.writeContract,
      commentsAddress,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });
});

describe("deleteComment()", () => {
  let commentId: Hex;

  beforeEach(async () => {
    const approvalResult = await addApprovalAsAuthor({
      app: appAccount.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: approvalResult.txHash,
    });

    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const appSignature = await appClient.signTypedData(
      createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress,
      })
    );

    const postResult = await postCommentAsAuthor({
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

    assert.ok(logs.length > 0, "CommentAdded event should be found");
    commentId = logs[0]!.args.commentId;
  });

  it("deletes a comment with signatures", async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const typedData = createDeleteCommentTypedData({
      commentId,
      chainId: anvil.id,
      author: account.address,
      app: appAccount.address,
      nonce,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);

    const result = await deleteComment({
      commentId,
      author: account.address,
      app: appAccount.address,
      nonce,
      deadline: typedData.message.deadline,
      appSignature,
      writeContract: appClient.writeContract,
      commentsAddress,
    });

    const receipt = await appClient.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });

  it("fails with invalid signatures", async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const typedData = createDeleteCommentTypedData({
      commentId,
      chainId: anvil.id,
      author: account.address,
      app: appAccount.address,
      nonce,
      commentsAddress,
    });

    await assert.rejects(
      () =>
        deleteComment({
          commentId,
          author: account.address,
          app: appAccount.address,
          nonce,
          deadline: typedData.message.deadline,
          appSignature: "0x1234", // Invalid signature
          writeContract: appClient.writeContract,
          commentsAddress,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        return true;
      }
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
      nonce: 0n,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      readContract: client.readContract,
      commentsAddress,
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
      commentsAddress,
    });

    assert.ok(typeof nonce === "bigint", "should return a bigint");
  });
});

describe("editCommentAsAuthor()", () => {
  let commentId: Hex;

  beforeEach(async () => {
    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      metadata: { test: true },
      nonce,
      targetUri: "https://example.com",
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);

    const result = await postCommentAsAuthor({
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

    assert.ok(logs.length > 0, "CommentAdded event should be found");
    commentId = logs[0]!.args.commentId;
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
      metadataObject: { test: true, updated: true },
    });

    const typedData = createEditCommentTypedData({
      author: account.address,
      edit,
      chainId: anvil.id,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);

    const result = await editCommentAsAuthor({
      edit,
      writeContract: client.writeContract,
      commentsAddress,
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
      commentsAddress,
    });

    assert.equal(updatedComment.comment.content, "Updated comment content");
  });
});

describe("editComment()", () => {
  let commentId: Hex;

  beforeEach(async () => {
    const approvalResult = await addApprovalAsAuthor({
      app: appAccount.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: approvalResult.txHash,
    });

    const nonce = await getNonce({
      author: account.address,
      app: appAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      app: appAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const appSignature = await appClient.signTypedData(
      createCommentTypedData({
        chainId: anvil.id,
        commentData,
        commentsAddress,
      })
    );

    const postResult = await postCommentAsAuthor({
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

    assert.ok(logs.length > 0, "CommentAdded event should be found");
    commentId = logs[0]!.args.commentId;
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
      metadataObject: { test: true, updated: true },
    });

    const typedData = createEditCommentTypedData({
      author: account.address,
      chainId: anvil.id,
      edit,
      commentsAddress,
    });

    const appSignature = await appClient.signTypedData(typedData);

    const result = await editComment({
      edit,
      appSignature,
      writeContract: appClient.writeContract,
      commentsAddress,
    });

    const receipt = await appClient.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify the comment was updated
    const updatedComment = await getComment({
      commentId,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.equal(updatedComment.comment.content, "Updated comment content");
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
      metadataObject: { test: true, updated: true },
    });

    await assert.rejects(
      () =>
        editComment({
          edit,
          appSignature: "0x1234", // Invalid signature
          writeContract: appClient.writeContract,
          commentsAddress,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        return true;
      }
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
      commentsAddress,
    });

    assert.ok(result.startsWith("0x"), "should return a hex string");
    assert.equal(result.length, 66, "should be 32 bytes + 0x prefix");
  });
});
