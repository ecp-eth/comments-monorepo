/**
 * Ethereum Comments Protocol SDK types module
 * 
 * @module
 */

/**
 * Hex string type, must start with `0x`
 */
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
