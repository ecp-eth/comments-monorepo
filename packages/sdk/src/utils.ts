import {
  type Chain,
  createPublicClient,
  type Hex,
  stringToHex,
  type Transport,
} from "viem";
import { http } from "wagmi";
import { CommentsV1Abi } from "./abis.js";
import {
  COMMENTS_V1_ADDRESS,
  DEFAULT_CHANNEL_ID,
  DEFAULT_COMMENT_TYPE,
  EMPTY_PARENT_ID,
} from "./constants.js";
import {
  ADD_APPROVAL_TYPE,
  COMMENT_TYPE,
  DELETE_COMMENT_TYPE,
  DOMAIN_NAME,
  DOMAIN_VERSION,
} from "./eip712.js";
import {
  AddCommentTypedDataSchema,
  type AddCommentTypedDataSchemaType,
  CommentDataSchema,
  type CommentData,
  DeleteCommentTypedDataSchema,
  type DeleteCommentTypedDataSchemaType,
  AddApprovalTypedDataSchema,
  type AddApprovalTypedDataSchemaType,
} from "./schemas/index.js";

/**
 * Check if a hex string is zero
 * @param hex The hex string to check
 * @returns True if the hex string is zero, false otherwise
 */
export function isZeroHex(hex: `0x${string}`) {
  return hex.replace(/0/g, "") === "x";
}

/**
 * The shared parameters for creating a comment
 */
export type CreateCommentDataParamsShared = {
  /** The content of the comment */
  content: string;
  /**
   * The ID of the channel the comment is being made in
   *
   * If not provided, the default channel ID (0) will be used
   *
   * @default 0n
   */
  channelId?: bigint;
  /**
   * The type of the comment
   *
   * If not provided, the default comment type (comment) will be used
   *
   * @default "comment"
   */
  commentType?: string;
  /** Metadata about the comment */
  metadata?: object;
  /** The address of the author of the comment */
  author: Hex;
  /** The address of the app signer */
  appSigner: Hex;
  /** The current nonce for the user per app on the chain */
  nonce: bigint;
  /** The deadline of the comment submission in seconds since epoch */
  deadline?: bigint;
};

/**
 * The parameters for creating a root comment
 */
export type CreateCommentDataParamsRoot = CreateCommentDataParamsShared & {
  /** The URI of the page the comment is about */
  targetUri: string;
};

/**
 * The parameters for creating a reply comment
 */
export type CreateCommentDataParamsReply = CreateCommentDataParamsShared & {
  /** The ID of the parent comment */
  parentId: Hex;
};

/**
 * The parameters for creating a comment
 */
export type CreateCommentDataParams =
  | CreateCommentDataParamsRoot
  | CreateCommentDataParamsReply;

/**
 * Create the data structure of a comment
 * @return {@link schemas!CommentData | CommentData} The data structure of a comment
 */
export function createCommentData({
  content,
  metadata,
  author,
  appSigner,
  nonce,
  deadline,
  channelId = DEFAULT_CHANNEL_ID,
  commentType = DEFAULT_COMMENT_TYPE,
  ...params
}: CreateCommentDataParams): CommentData {
  return CommentDataSchema.parse({
    content,
    metadata: metadata ? JSON.stringify(metadata) : "",
    targetUri: "parentId" in params ? "" : params.targetUri,
    parentId: "parentId" in params ? params.parentId : EMPTY_PARENT_ID,
    author,
    appSigner,
    channelId,
    commentType,
    nonce,
    deadline: deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day
  });
}

/**
 * Create the EIP-712 typed data structure for adding comment
 * @returns The typed data
 */
export function createCommentTypedData({
  commentData,
  chainId,
}: {
  commentData: CommentData;
  chainId: number;
}): AddCommentTypedDataSchemaType {
  return AddCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_ADDRESS,
    },
    types: COMMENT_TYPE,
    primaryType: "AddComment",
    message: commentData,
  });
}

/**
 * Create the EIP-712 typed data structure for approving comment
 * @returns The typed data
 */
export function createApprovalTypedData({
  author,
  appSigner,
  nonce,
  deadline,
  chainId,
}: {
  author: Hex;
  appSigner: Hex;
  chainId: number;
  nonce: bigint;
  deadline?: bigint;
}): AddApprovalTypedDataSchemaType {
  return AddApprovalTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_ADDRESS,
    },
    types: ADD_APPROVAL_TYPE,
    primaryType: "AddApproval",
    message: {
      author,
      appSigner,
      nonce,
      deadline:
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
    },
  });
}

/**
 * Read the nonce from CommentsV1 contract for a given author and app signer
 * @returns The nonce for the given author and app signer
 */
export async function getNonce({
  author,
  appSigner,
  chain,
  transport,
}: {
  author: Hex;
  appSigner: Hex;
  chain: Chain;
  transport?: Transport;
}) {
  const publicClient = createPublicClient({
    chain,
    transport: transport ?? http(),
  });

  const nonce = await publicClient.readContract({
    address: COMMENTS_V1_ADDRESS,
    abi: CommentsV1Abi,
    functionName: "nonces",
    args: [author, appSigner],
  });

  return nonce;
}

/**
 * Create the EIP-712 typed data structure for deleting comment
 *
 * The comment won't be really deleted because of the nature of the blockchain.
 * The purpose of this is to mark comment as deleted so indexers can do their logic for deletions.
 *
 * @returns The typed data
 */
export function createDeleteCommentTypedData({
  commentId,
  chainId,
  author,
  appSigner,
  nonce,
  deadline,
}: {
  commentId: Hex;
  chainId: number;
  author: Hex;
  appSigner: Hex;
  nonce: bigint;
  deadline?: bigint;
}): DeleteCommentTypedDataSchemaType {
  return DeleteCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_ADDRESS,
    },
    types: DELETE_COMMENT_TYPE,
    primaryType: "DeleteComment",
    message: {
      commentId,
      author,
      appSigner,
      nonce,
      deadline:
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
    },
  });
}

/**
 * Get the cursor for a comment
 * @param commentId The ID of the comment
 * @param timestamp The timestamp of the comment
 * @returns The cursor for the comment
 */
export function getCommentCursor(commentId: Hex, timestamp: Date): Hex {
  return stringToHex(`${timestamp.getTime()}:${commentId}`);
}
