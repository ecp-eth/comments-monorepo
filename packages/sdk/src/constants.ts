/**
 * The address of the CommentsV1 contract.
 * It is created using the CREATE2 opcode so should be identical across chains if no collisions occur.
 */
export const COMMENTS_V1_ADDRESS =
  "0xdbf97d1bacd56c707b77545e218176ae61a93641" as const;

/**
 * The default `embedUri` for the CommentsEmbed component.
 * It runs a service that creates app signatures for requests and
 * submits the transaction to the CommentsV1 contract.
 */
export const COMMENTS_EMBED_DEFAULT_URL = "https://embed.ethcomments.xyz";
