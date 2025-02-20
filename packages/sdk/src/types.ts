/**
 * Ethereum Comments Protocol SDK types module
 * 
 * @module
 */
import type { SignTypedDataParameters } from "viem";

export type Hex = `0x${string}`;

/**
 * The data structure of a comment to be signed and then passed to the Embed API
 */
export type CommentData = {
  /**
   * The content of the comment
   */
  content: string;
  /**
   * Metadata about the comment
   */
  metadata: string;
  /**
   * Empty string for replies
   */
  targetUri: string;
  /**
   * id of parent comments if it has one, 0x for no parent comment
   * 
   * @remarks This zero address (32 bytes of zeros) indicates the comment has no parent and is a top-level comment
   */
  parentId: Hex;
  /**
   * The address of the author of the comment
   */
  author: Hex;
  /**
   * The address of the app signer
   */
  appSigner: Hex;
  /**
   * The nonce of the comment
   */
  nonce: bigint;
  /**
   * The deadline of the comment submission in seconds since epoch
   */
  deadline: bigint;
};

/**
 * The data structure of a comment to be fetched from the Embed API
 */
export type Comment = {
  /**
   * The timestamp of the comment
   */
  timestamp: Date;
  id: Hex;
  content: string;
  metadata: string;
  targetUri: string | null;
  parentId: Hex | null;
  author: Hex;
  chainId: number;
  deletedAt: Date | null;
  appSigner: Hex;
  txHash: Hex;
  logIndex: number;
  replies: Comment[];
};

/**
 * The response from the Embed API
 */
export type FetchCommentsResponse = {
  results: Comment[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

/**
 * Request for signing a comment.
 */
export type SignCommentRequest = {
  /**
   * Content of the comment.
   */
  content: string;
  /**
   * Target resource identifier for the comment
   */
  targetUri?: string;
  /**
   * ID of the parent comment.
   */
  parentId?: Hex;
  /**
   * Address of the author of the comment.
   */
  author: Hex;
};

export type SignCommentResponse = {
  signature: Hex;
  hash: Hex;
  data: CommentData;
};

export type SignCommentGaslessResponse = {
  txHash: Hex;
};

export type SignCommentGaslessPrepareResponse = {
  signTypedDataArgs: SignTypedDataParameters;
  appSignature: Hex;
};

export type PostCommentsOnUsersBehalfApprovalRequest = {
  signTypedDataArgs: SignTypedDataParameters;
  appSignature: Hex;
  authorSignature: Hex;
};

export type ApprovePostingCommentsOnUsersBehalfResponse = {
  txHash: Hex;
};

export type PostingCommentsOnUsersBehalfApprovalStatusResponse = {
  approved: boolean;
  signTypedDataArgs: SignTypedDataParameters;
  appSignature: Hex;
};
