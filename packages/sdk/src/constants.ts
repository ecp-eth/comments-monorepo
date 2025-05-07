import { toHex } from "viem/utils";

/**
 * The address of the `CommentManager` contract.
 * It is created using the CREATE2 opcode so should be identical across chains if no collisions occur.
 */
export const COMMENT_MANAGER_ADDRESS =
  "0xbEEef47Eed96619B7511B1655089e8D7c25D3Ba1" as const;

/**
 * The address of the ChannelManager contract.
 */
export const CHANNEL_MANAGER_ADDRESS =
  "0xeef597fb9A8CeB8204315706a69cdC2824734c66" as const;

/**
 * The zero address.
 */
export const ZERO_ADDRESS = toHex(0, { size: 20 });

/**
 * The default channel ID for the CommentManager contract.
 */
export const DEFAULT_CHANNEL_ID = 0n;

/**
 * The default comment type for the `CommentManager` contract.
 */
export const DEFAULT_COMMENT_TYPE = "comment" as const;

/**
 * The default `embedUri` for the CommentsEmbed component.
 * It runs a service that creates app signatures for requests and
 * submits the transaction to the `CommentManager` contract.
 */
export const COMMENTS_EMBED_DEFAULT_URL = "https://embed.ethcomments.xyz";

/**
 * The default `embedUri` for the CommentsByAuthorEmbed component.
 * It runs a service that creates app signatures for requests and
 * submits the transaction to the `CommentManager` contract.
 */
export const COMMENTS_EMBED_DEFAULT_BY_AUTHOR_URL =
  "https://embed.ethcomments.xyz/by-author";

/**
 * The default URL for the Indexer API.
 *
 * It is used to fetch comments and replies.
 */
export const INDEXER_API_URL = "https://api.ethcomments.xyz";

/**
 * The parent ID for comments that are not replies.
 *
 * This is bytes32(0)
 */
export const EMPTY_PARENT_ID = toHex(0, { size: 32 });
