import {
  hashTypedData,
  verifyTypedData,
  type Address,
  type TypedDataDomain,
  type TypedDataParameter,
} from "viem";
import type { Hex } from "../core/schemas.js";
import type { MetadataEntry } from "./types.js";
import {
  ADD_COMMENT_TYPE,
  EDIT_COMMENT_TYPE,
  DOMAIN_NAME,
  DOMAIN_VERSION,
} from "./eip712.js";
import {
  createMetadataEntry,
  createMetadataEntries,
  convertJsonMetadataToEntries,
} from "./metadata.js";

/**
 * Comment data structure that includes metadata for signing
 */
export interface CommentDataForSigning {
  content: string;
  metadata: MetadataEntry[];
  targetUri: string;
  commentType: number;
  author: Address;
  app: Address;
  channelId: bigint;
  deadline: bigint;
  parentId: Hex;
}

/**
 * Edit comment data structure that includes metadata for signing
 */
export interface EditCommentDataForSigning {
  commentId: Hex;
  content: string;
  metadata: MetadataEntry[];
  author: Address;
  app: Address;
  nonce: bigint;
  deadline: bigint;
}

/**
 * Creates the EIP-712 domain for comment signatures
 */
export function createCommentDomain(
  chainId: number,
  verifyingContract: Address,
): TypedDataDomain {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}

/**
 * Creates the EIP-712 typed data for adding a comment with metadata
 */
export function createAddCommentTypedDataWithMetadata(
  commentData: CommentDataForSigning,
  chainId: number,
  verifyingContract: Address,
) {
  return {
    primaryType: "AddComment" as const,
    domain: createCommentDomain(chainId, verifyingContract),
    types: ADD_COMMENT_TYPE,
    message: commentData,
  };
}

/**
 * Creates the EIP-712 typed data for editing a comment with metadata
 */
export function createEditCommentTypedDataWithMetadata(
  editData: EditCommentDataForSigning,
  chainId: number,
  verifyingContract: Address,
) {
  return {
    primaryType: "EditComment" as const,
    domain: createCommentDomain(chainId, verifyingContract),
    types: EDIT_COMMENT_TYPE,
    message: editData,
  };
}

/**
 * Generates the hash for signing a comment with metadata
 */
export function getAddCommentSigningHash(
  commentData: CommentDataForSigning,
  chainId: number,
  verifyingContract: Address,
): Hex {
  const typedData = createAddCommentTypedDataWithMetadata(
    commentData,
    chainId,
    verifyingContract,
  );
  return hashTypedData(typedData);
}

/**
 * Generates the hash for signing an edit comment with metadata
 */
export function getEditCommentSigningHash(
  editData: EditCommentDataForSigning,
  chainId: number,
  verifyingContract: Address,
): Hex {
  const typedData = createEditCommentTypedDataWithMetadata(
    editData,
    chainId,
    verifyingContract,
  );
  return hashTypedData(typedData);
}

/**
 * Verifies a signature for adding a comment with metadata
 */
export async function verifyAddCommentSignature(
  commentData: CommentDataForSigning,
  signature: Hex,
  signerAddress: Address,
  chainId: number,
  verifyingContract: Address,
): Promise<boolean> {
  try {
    const typedData = createAddCommentTypedDataWithMetadata(
      commentData,
      chainId,
      verifyingContract,
    );
    return await verifyTypedData({
      ...typedData,
      address: signerAddress,
      signature,
    });
  } catch {
    return false;
  }
}

/**
 * Verifies a signature for editing a comment with metadata
 */
export async function verifyEditCommentSignature(
  editData: EditCommentDataForSigning,
  signature: Hex,
  signerAddress: Address,
  chainId: number,
  verifyingContract: Address,
): Promise<boolean> {
  try {
    const typedData = createEditCommentTypedDataWithMetadata(
      editData,
      chainId,
      verifyingContract,
    );
    return await verifyTypedData({
      ...typedData,
      address: signerAddress,
      signature,
    });
  } catch {
    return false;
  }
}

/**
 * Helper to create comment data with automatic metadata conversion
 */
export function createCommentDataWithMetadata(params: {
  content: string;
  metadata?: Record<string, any> | MetadataEntry[];
  targetUri: string;
  commentType?: number;
  author: Address;
  app: Address;
  channelId: bigint;
  deadline: bigint;
  parentId: Hex;
}): CommentDataForSigning {
  let metadataEntries: MetadataEntry[];

  if (Array.isArray(params.metadata)) {
    // Already MetadataEntry[]
    metadataEntries = params.metadata;
  } else if (params.metadata && typeof params.metadata === "object") {
    // Convert object to MetadataEntry[]
    metadataEntries = convertJsonMetadataToEntries(params.metadata);
  } else {
    // No metadata
    metadataEntries = [];
  }

  return {
    content: params.content,
    metadata: metadataEntries,
    targetUri: params.targetUri,
    commentType: params.commentType ?? 0,
    author: params.author,
    app: params.app,
    channelId: params.channelId,
    deadline: params.deadline,
    parentId: params.parentId,
  };
}

/**
 * Helper to create edit comment data with automatic metadata conversion
 */
export function createEditCommentDataWithMetadata(params: {
  commentId: Hex;
  content: string;
  metadata?: Record<string, any> | MetadataEntry[];
  author: Address;
  app: Address;
  nonce: bigint;
  deadline: bigint;
}): EditCommentDataForSigning {
  let metadataEntries: MetadataEntry[];

  if (Array.isArray(params.metadata)) {
    // Already MetadataEntry[]
    metadataEntries = params.metadata;
  } else if (params.metadata && typeof params.metadata === "object") {
    // Convert object to MetadataEntry[]
    metadataEntries = convertJsonMetadataToEntries(params.metadata);
  } else {
    // No metadata
    metadataEntries = [];
  }

  return {
    commentId: params.commentId,
    content: params.content,
    metadata: metadataEntries,
    author: params.author,
    app: params.app,
    nonce: params.nonce,
    deadline: params.deadline,
  };
}

/**
 * Utility to verify that a comment's signature includes specific metadata
 */
export async function verifyCommentIncludesMetadata(
  commentData: CommentDataForSigning,
  requiredMetadataKeys: string[],
  signature: Hex,
  signerAddress: Address,
  chainId: number,
  verifyingContract: Address,
): Promise<boolean> {
  // Check if all required metadata keys are present
  const presentKeys = new Set(commentData.metadata.map((entry) => entry.key));
  const missingKeys = requiredMetadataKeys.filter((key) => {
    const keyHash = createMetadataEntry(key, "").key; // Get the key hash
    return !presentKeys.has(keyHash);
  });

  if (missingKeys.length > 0) {
    return false;
  }

  // Verify the signature
  return await verifyAddCommentSignature(
    commentData,
    signature,
    signerAddress,
    chainId,
    verifyingContract,
  );
}

/**
 * Create standard metadata entries for common use cases
 */
export const MetadataHelpers = {
  /**
   * Create metadata for a reaction comment
   */
  reaction(reactionType: string): MetadataEntry[] {
    return [createMetadataEntry("reaction_type", reactionType)];
  },

  /**
   * Create metadata for a comment with tags
   */
  withTags(tags: string[]): MetadataEntry[] {
    return [createMetadataEntry("tags", tags.join(","))];
  },

  /**
   * Create metadata for a comment with author info
   */
  withAuthorInfo(username: string, avatarUrl?: string): MetadataEntry[] {
    const entries = [createMetadataEntry("username", username)];
    if (avatarUrl) {
      entries.push(createMetadataEntry("avatar_url", avatarUrl));
    }
    return entries;
  },

  /**
   * Create metadata for a comment with a reference URL
   */
  withReference(url: string, title?: string): MetadataEntry[] {
    const entries = [createMetadataEntry("reference_url", url)];
    if (title) {
      entries.push(createMetadataEntry("reference_title", title));
    }
    return entries;
  },

  /**
   * Create metadata for a comment with custom data
   */
  custom(key: string, value: string | number | boolean): MetadataEntry[] {
    return [createMetadataEntry(key, value)];
  },
};
