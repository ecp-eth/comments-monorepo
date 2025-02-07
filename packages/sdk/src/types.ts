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
