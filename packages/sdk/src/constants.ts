import { toHex } from "viem/utils";
import type { Hex } from "./core/schemas.js";

/**
 * The address of the `CommentManager` contract.
 * It is created using the CREATE2 opcode so should be identical across chains if no collisions occur.
 */
export const COMMENT_MANAGER_ADDRESS = (
  __DEV__
    ? "0x529F00cB359e6215EAc89F6CfC061055CF6117c9"
    : "0xeAe48a20843Cd4b9Ada3eb225a753AC382527ba6"
) as Hex;

/**
 * The address of the ChannelManager contract.
 */
export const CHANNEL_MANAGER_ADDRESS = (
  __DEV__
    ? "0x6Cd0F30ABaC3351Ca4F24DB3479bC8fcc2A9C1e1"
    : "0x1C2330E591090f904ecbD32045eE5Df3FC8Dc754"
) as Hex;

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
