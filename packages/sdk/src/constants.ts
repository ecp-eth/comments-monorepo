import { toHex } from "viem/utils";
import type { Hex } from "./core/schemas.js";

/**
 * The address of the `CommentManager` contract.
 * It is created using the CREATE2 opcode so should be identical across chains if no collisions occur.
 */
export const COMMENT_MANAGER_ADDRESS = (
  __DEV__
    ? "0xCcD20e37E5639246B59A42585259d6Bd4AD01f10"
    : "0x70d13009044845Ef26E783F7B6b2415676EAa5a1"
) as Hex;

/**
 * The address of the ChannelManager contract.
 */
export const CHANNEL_MANAGER_ADDRESS = (
  __DEV__
    ? "0x7950f5fEb11687bdA31341E956e299850Fc9594E"
    : "0xBf9f1722Be63863021Cb676e4C024a03bAA0657c"
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
