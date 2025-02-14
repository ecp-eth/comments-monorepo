import type { SignTypedDataParameters } from "viem";

export type Hex = `0x${string}`;

export type CommentData = {
  content: string;
  metadata: string;
  /**
   * Empty string for replies
   */
  targetUri: string;
  /**
   * 0 bytes Hex for parent comments
   */
  parentId: Hex;
  author: Hex;
  appSigner: Hex;
  nonce: bigint;
  deadline: bigint;
};

export type Comment = {
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
