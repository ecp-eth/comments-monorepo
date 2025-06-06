/**
 * Examples demonstrating how to use the new metadata serialization and signature verification system
 */

import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";
import type { Hex } from "../core/schemas.js";
import {
  COMMENT_MANAGER_ADDRESS,
  COMMENT_TYPE_COMMENT,
  COMMENT_TYPE_REACTION,
} from "../constants.js";
import {
  createMetadataEntry,
  createMetadataEntries,
  createCustomMetadataEntry,
  encodeStringValue,
  encodeNumberValue,
  encodeBoolValue,
} from "./metadata.js";
import {
  createCommentDataWithMetadata,
  createEditCommentDataWithMetadata,
  getAddCommentSigningHash,
  getEditCommentSigningHash,
  verifyAddCommentSignature,
  verifyEditCommentSignature,
  verifyCommentIncludesMetadata,
  MetadataHelpers,
} from "./metadata-signatures.js";

/**
 * Example 1: Creating a simple comment with basic metadata
 */
export async function exampleBasicCommentWithMetadata() {
  // Create metadata entries
  const metadata = [
    createMetadataEntry("status", "published"),
    createMetadataEntry("priority", 1),
    createMetadataEntry("verified", true),
  ];

  // Create comment data
  const commentData = createCommentDataWithMetadata({
    content: "This is a comment with metadata",
    metadata,
    targetUri: "https://example.com/post/123",
    commentType: COMMENT_TYPE_COMMENT,
    author: "0x1234567890123456789012345678901234567890" as Address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    channelId: 0n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  });

  // Generate signing hash
  const signingHash = getAddCommentSigningHash(
    commentData,
    1, // chainId (mainnet)
    COMMENT_MANAGER_ADDRESS,
  );

  console.log("Comment data:", commentData);
  console.log("Signing hash:", signingHash);
  return { commentData, signingHash };
}

/**
 * Example 2: Creating a reaction comment
 */
export async function exampleReactionComment() {
  // Create reaction metadata
  const metadata = MetadataHelpers.reaction("like");

  const reactionData = createCommentDataWithMetadata({
    content: "like", // For reactions, content contains the reaction type
    metadata,
    targetUri: "",
    commentType: COMMENT_TYPE_REACTION,
    author: "0x1234567890123456789012345678901234567890" as Address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    channelId: 0n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
    parentId:
      "0x1234567890123456789012345678901234567890123456789012345678901234" as Hex, // Parent comment ID
  });

  return reactionData;
}

/**
 * Example 3: Creating a comment with author information metadata
 */
export async function exampleCommentWithAuthorInfo() {
  const metadata = [
    ...MetadataHelpers.withAuthorInfo(
      "alice.eth",
      "https://example.com/avatar.jpg",
    ),
    ...MetadataHelpers.withTags(["discussion", "web3", "ethereum"]),
  ];

  const commentData = createCommentDataWithMetadata({
    content: "Great discussion about web3!",
    metadata,
    targetUri: "https://blog.example.com/web3-discussion",
    commentType: COMMENT_TYPE_COMMENT,
    author: "0x1234567890123456789012345678901234567890" as Address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    channelId: 1n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  });

  return commentData;
}

/**
 * Example 4: Creating and verifying a signature
 */
export async function exampleCreateAndVerifySignature() {
  // Create a test account (DO NOT use in production)
  const account = privateKeyToAccount(
    "0x1234567890123456789012345678901234567890123456789012345678901234",
  );

  const metadata = [
    createMetadataEntry("app_version", "1.0.0"),
    createMetadataEntry("client_id", "my-app"),
  ];

  const commentData = createCommentDataWithMetadata({
    content: "This comment has a verifiable signature",
    metadata,
    targetUri: "https://example.com",
    commentType: COMMENT_TYPE_COMMENT,
    author: account.address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    channelId: 0n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  });

  // Get the hash to sign
  const signingHash = getAddCommentSigningHash(
    commentData,
    1, // chainId
    COMMENT_MANAGER_ADDRESS,
  );

  // Sign the hash (in practice, you'd use wallet.signTypedData)
  const signature = await account.signMessage({
    message: { raw: signingHash },
  });

  // Verify the signature
  const isValid = await verifyAddCommentSignature(
    commentData,
    signature,
    account.address,
    1, // chainId
    COMMENT_MANAGER_ADDRESS,
  );

  console.log("Signature valid:", isValid);
  return { commentData, signature, isValid };
}

/**
 * Example 5: Editing a comment with metadata
 */
export async function exampleEditCommentWithMetadata() {
  const editMetadata = [
    createMetadataEntry("edited", true),
    createMetadataEntry("edit_reason", "typo_fix"),
    createMetadataEntry("edit_timestamp", Date.now()),
  ];

  const editData = createEditCommentDataWithMetadata({
    commentId:
      "0x1234567890123456789012345678901234567890123456789012345678901234" as Hex,
    content: "This is the updated comment content",
    metadata: editMetadata,
    author: "0x1234567890123456789012345678901234567890" as Address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    nonce: 1n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
  });

  const signingHash = getEditCommentSigningHash(
    editData,
    1, // chainId
    COMMENT_MANAGER_ADDRESS,
  );

  return { editData, signingHash };
}

/**
 * Example 6: Verifying a comment includes required metadata
 */
export async function exampleVerifyRequiredMetadata() {
  const account = privateKeyToAccount(
    "0x1234567890123456789012345678901234567890123456789012345678901234",
  );

  // Create comment with required metadata
  const metadata = [
    createMetadataEntry("moderation_status", "approved"),
    createMetadataEntry("content_type", "text"),
    createMetadataEntry("language", "en"),
  ];

  const commentData = createCommentDataWithMetadata({
    content: "This comment meets all requirements",
    metadata,
    targetUri: "https://example.com",
    commentType: COMMENT_TYPE_COMMENT,
    author: account.address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    channelId: 0n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  });

  const signingHash = getAddCommentSigningHash(
    commentData,
    1,
    COMMENT_MANAGER_ADDRESS,
  );
  const signature = await account.signMessage({
    message: { raw: signingHash },
  });

  // Verify the comment includes required metadata
  const requiredKeys = ["moderation_status", "content_type", "language"];
  const isValid = await verifyCommentIncludesMetadata(
    commentData,
    requiredKeys,
    signature,
    account.address,
    1, // chainId
    COMMENT_MANAGER_ADDRESS,
  );

  console.log("Comment includes required metadata:", isValid);
  return { commentData, isValid };
}

/**
 * Example 7: Custom metadata types
 */
export async function exampleCustomMetadataTypes() {
  const metadata = [
    // Store an address
    createCustomMetadataEntry(
      "referrer",
      "address",
      "0x1234567890123456789012345678901234567890" as Hex,
    ),
    // Store a hash
    createCustomMetadataEntry(
      "content_hash",
      "bytes32",
      "0x1234567890123456789012345678901234567890123456789012345678901234" as Hex,
    ),
    // Store structured data as JSON
    createMetadataEntry("vote_data", {
      choice: "option_a",
      weight: 100,
      timestamp: Date.now(),
    }),
  ];

  const commentData = createCommentDataWithMetadata({
    content: "Comment with custom metadata types",
    metadata,
    targetUri: "https://dao.example.com/proposal/123",
    commentType: COMMENT_TYPE_COMMENT,
    author: "0x1234567890123456789012345678901234567890" as Address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    channelId: 2n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  });

  return commentData;
}

/**
 * Example 8: Legacy JSON metadata conversion
 */
export async function exampleLegacyMetadataConversion() {
  // Legacy JSON metadata
  const legacyMetadata = {
    status: "published",
    category: "general",
    tags: ["web3", "ethereum"],
    priority: 1,
    featured: true,
  };

  // Convert to new metadata format
  const commentData = createCommentDataWithMetadata({
    content: "Comment converted from legacy format",
    metadata: legacyMetadata, // Automatically converted to MetadataEntry[]
    targetUri: "https://example.com",
    commentType: COMMENT_TYPE_COMMENT,
    author: "0x1234567890123456789012345678901234567890" as Address,
    app: "0x0987654321098765432109876543210987654321" as Address,
    channelId: 0n,
    deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
    parentId:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  });

  console.log("Converted metadata:", commentData.metadata);
  return commentData;
}
