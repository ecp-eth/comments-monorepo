import type { SignTypedDataParameters } from "viem";

export type Hex = `0x${string}`;

export type CommentData = {
  content: string;
  metadata: string;
  /**
   * Empty string for replies
   */
  targetUrl: string;
  /**
   * 0 bytes Hex for parent comments
   */
  parentId: Hex;
  author: Hex;
  appSigner: Hex;
  nonce: bigint;
  deadline: bigint;
};

export type APIComment = {
  timestamp: Date;
  id: Hex;
  content: string;
  metadata: string;
  targetUrl: string | null;
  parentId: Hex | null;
  author: Hex;
  chainId: number;
  deletedAt: Date | null;
  appSigner: Hex;
  txHash: Hex;
  logIndex: number;
  replies: APIComment[];
};

export type APICommentsResponse = {
  results: APIComment[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type SignCommentRequest = {
  content: string;
  targetUrl?: string;
  parentId?: Hex;
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
