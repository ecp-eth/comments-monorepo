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
   * The nonce for the user per app
   */
  nonce: bigint;
  /**
   * The deadline of the comment submission in seconds since epoch
   */
  deadline: bigint;
};
