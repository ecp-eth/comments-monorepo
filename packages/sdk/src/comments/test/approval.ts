import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  createWalletClient,
  http,
  publicActions,
  ContractFunctionExecutionError,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import {
  isApproved,
  addApprovalAsAuthor,
  addApproval,
  revokeApprovalAsAuthor,
  revokeApproval,
  getAddApprovalHash,
  getRemoveApprovalHash,
  createApprovalTypedData,
  createRemoveApprovalTypedData,
} from "../approval.js";
import { deployContracts } from "../../../scripts/test-helpers.js";
import type { Hex } from "../../core/schemas.js";
import { getNonce } from "../comment.js";
import type {
  AddApprovalTypedDataSchemaType,
  RemoveApprovalTypedDataSchemaType,
} from "../schemas.js";
const { commentsAddress } = deployContracts();

// Test account setup
const testPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil's first private key
const account = privateKeyToAccount(testPrivateKey);

const appPrivateKey =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Anvil's second private key
const app = privateKeyToAccount(appPrivateKey);

// Create wallet client
const client = createWalletClient({
  chain: anvil,
  transport: http("http://localhost:8545"),
  account,
}).extend(publicActions);

const appClient = createWalletClient({
  chain: anvil,
  transport: http("http://localhost:8545"),
  account: app,
}).extend(publicActions);

describe("isApproved()", () => {
  it("checks if app signer is not approved", async () => {
    const approved = await isApproved({
      author: account.address,
      app: app.address,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.equal(
      approved,
      false,
      "app signer should not be approved initially",
    );
  });
});

describe("addApprovalAsAuthor()", () => {
  it("approves app signer", async () => {
    const result = await addApprovalAsAuthor({
      app: app.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify approval
    const approved = await isApproved({
      author: account.address,
      app: app.address,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.equal(approved, true, "app signer should be approved");
  });
});

describe("addApproval()", () => {
  let authorSignature: Hex;
  let typedData: AddApprovalTypedDataSchemaType;

  beforeEach(async () => {
    const nonce = await getNonce({
      author: client.account.address,
      app: app.address,
      readContract: client.readContract,
      commentsAddress,
    });

    typedData = createApprovalTypedData({
      author: client.account.address,
      app: app.address,
      nonce,
      commentsAddress,
      chainId: anvil.id,
    });

    authorSignature = await client.signTypedData(typedData);
  });

  it("adds approval with signature", async () => {
    const result = await addApproval({
      typedData,
      signature: authorSignature,
      writeContract: appClient.writeContract,
      commentsAddress,
    });

    const receipt = await appClient.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    const approved = await isApproved({
      author: account.address,
      app: app.address,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.equal(approved, true, "app signer should be approved");
  });

  it("fails with invalid signature", async () => {
    await assert.rejects(
      () =>
        addApproval({
          typedData,
          signature: "0x1234", // Invalid signature
          writeContract: client.writeContract,
          commentsAddress,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        return true;
      },
    );
  });
});

describe("revokeApprovalAsAuthor()", () => {
  beforeEach(async () => {
    // First approve the app signer
    const result = await addApprovalAsAuthor({
      app: app.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: result.txHash,
    });
  });

  it("revokes approval", async () => {
    const result = await revokeApprovalAsAuthor({
      app: app.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify approval is revoked
    const approved = await isApproved({
      author: account.address,
      app: app.address,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.equal(approved, false, "app signer should not be approved");
  });
});

describe("revokeApproval()", () => {
  let signature: Hex;
  let typedData: RemoveApprovalTypedDataSchemaType;

  beforeEach(async () => {
    const result = await addApprovalAsAuthor({
      app: app.address,
      writeContract: client.writeContract,
      commentsAddress,
    });

    await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    const nonce = await getNonce({
      author: client.account.address,
      app: app.address,
      readContract: client.readContract,
      commentsAddress,
    });

    typedData = createRemoveApprovalTypedData({
      author: client.account.address,
      app: app.address,
      nonce,
      commentsAddress,
      chainId: anvil.id,
    });

    signature = await client.signTypedData(typedData);
  });

  it("revokes approval with signature", async () => {
    const result = await revokeApproval({
      typedData,
      signature,
      writeContract: client.writeContract,
      commentsAddress,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: result.txHash,
    });

    assert.equal(receipt.status, "success");

    // Verify approval is revoked
    const approved = await isApproved({
      author: account.address,
      app: app.address,
      readContract: client.readContract,
      commentsAddress,
    });

    assert.equal(approved, false, "app signer should not be approved");
  });

  it("fails with invalid signature", async () => {
    await assert.rejects(
      () =>
        revokeApproval({
          typedData,
          signature: "0x1234", // Invalid signature
          writeContract: client.writeContract,
          commentsAddress,
        }),
      (err) => {
        assert.ok(err instanceof ContractFunctionExecutionError);
        return true;
      },
    );
  });
});

describe("getAddApprovalHash()", () => {
  it("returns hash for approval", async () => {
    const result = await getAddApprovalHash({
      author: account.address,
      app: app.address,
      nonce: 0n,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      readContract: client.readContract,
      commentsAddress,
    });

    assert.ok(result.hash.startsWith("0x"), "should return a hex string");
    assert.equal(result.hash.length, 66, "should be 32 bytes + 0x prefix");
  });
});

describe("getRemoveApprovalHash()", () => {
  it("returns hash for removal", async () => {
    const result = await getRemoveApprovalHash({
      author: account.address,
      app: app.address,
      nonce: 0n,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      readContract: client.readContract,
      commentsAddress,
    });

    assert.ok(result.hash.startsWith("0x"), "should return a hex string");
    assert.equal(result.hash.length, 66, "should be 32 bytes + 0x prefix");
  });
});
