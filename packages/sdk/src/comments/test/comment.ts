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
} from "../comment.js";
import { addApprovalAsAuthor } from "../approval.js";
import { CommentsV1Abi } from "../../abis.js";
import { deployContracts } from "../../../scripts/test-helpers.js";
import type { Hex } from "../../core/schemas.js";
import type { CommentData } from "../types.js";

const { commentsAddress } = deployContracts();

// Test account setup
const testPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil's first private key
const account = privateKeyToAccount(testPrivateKey);

const appSignerPrivateKey =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Anvil's second private key
const appSignerAccount = privateKeyToAccount(appSignerPrivateKey);

// Create wallet client
const client = createWalletClient({
  chain: anvil,
  transport: http("http://localhost:8545"),
  account,
}).extend(publicActions);

const appSignerClient = createWalletClient({
  chain: anvil,
  transport: http("http://localhost:8545"),
  account: appSignerAccount,
}).extend(publicActions);

describe("postCommentAsAuthor()", () => {
  it("posts a comment as author", async () => {
    const nonce = await getNonce({
      author: account.address,
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      appSigner: appSignerAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    const appSignature = await appSignerClient.signTypedData(typedData);

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
  let commentData: CommentData;

  beforeEach(async () => {
    const approvalResult = await addApprovalAsAuthor({
      appSigner: appSignerAccount.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: approvalResult.txHash,
    });

    const nonce = await getNonce({
      author: account.address,
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    commentData = createCommentData({
      author: account.address,
      appSigner: appSignerAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    appSignature = await appSignerClient.signTypedData(typedData);
  });

  it("posts a comment with signatures", async () => {
    const result = await postComment({
      comment: commentData,
      appSignature,
      writeContract: appSignerClient.writeContract,
      commentsAddress,
    });

    const receipt = await appSignerClient.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });

  it("fails with invalid author signature", async () => {
    const nonce = await getNonce({
      author: account.address,
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    await assert.rejects(
      () =>
        postComment({
          comment: createCommentData({
            appSigner: appSignerAccount.address,
            author: account.address,
            content: "Test comment content",
            metadata: { test: true },
            nonce,
            targetUri: "https://example.com",
          }),
          appSignature,
          writeContract: appSignerClient.writeContract,
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
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      appSigner: appSignerAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const typedData = createCommentTypedData({
      chainId: anvil.id,
      commentData,
      commentsAddress,
    });

    const appSignature = await appSignerClient.signTypedData(typedData);

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
      abi: CommentsV1Abi,
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
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentId = await getCommentId({
      commentData: {
        appSigner: appSignerAccount.address,
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
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      appSigner: appSignerAccount.address,
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

    const appSignature = await appSignerClient.signTypedData(typedData);

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
      abi: CommentsV1Abi,
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
      appSigner: appSignerAccount.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: approvalResult.txHash,
    });

    const nonce = await getNonce({
      author: account.address,
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const commentData = createCommentData({
      author: account.address,
      appSigner: appSignerAccount.address,
      content: "Test comment content",
      targetUri: "https://example.com",
      nonce,
    });

    const appSignature = await appSignerClient.signTypedData(
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
      abi: CommentsV1Abi,
      logs: receipt.logs,
      eventName: "CommentAdded",
    });

    assert.ok(logs.length > 0, "CommentAdded event should be found");
    commentId = logs[0]!.args.commentId;
  });

  it("deletes a comment with signatures", async () => {
    const nonce = await getNonce({
      author: account.address,
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const typedData = createDeleteCommentTypedData({
      commentId,
      chainId: anvil.id,
      author: account.address,
      appSigner: appSignerAccount.address,
      nonce,
      commentsAddress,
    });

    const appSignature = await appSignerClient.signTypedData(typedData);

    const result = await deleteComment({
      commentId,
      author: account.address,
      appSigner: appSignerAccount.address,
      nonce,
      deadline: typedData.message.deadline,
      appSignature,
      writeContract: appSignerClient.writeContract,
      commentsAddress,
    });

    const receipt = await appSignerClient.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");
  });

  it("fails with invalid signatures", async () => {
    const nonce = await getNonce({
      author: account.address,
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    const typedData = createDeleteCommentTypedData({
      commentId,
      chainId: anvil.id,
      author: account.address,
      appSigner: appSignerAccount.address,
      nonce,
      commentsAddress,
    });

    await assert.rejects(
      () =>
        deleteComment({
          commentId,
          author: account.address,
          appSigner: appSignerAccount.address,
          nonce,
          deadline: typedData.message.deadline,
          appSignature: "0x1234", // Invalid signature
          writeContract: appSignerClient.writeContract,
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
      appSigner: appSignerAccount.address,
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
      appSigner: appSignerAccount.address,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.ok(typeof nonce === "bigint", "should return a bigint");
  });
});
