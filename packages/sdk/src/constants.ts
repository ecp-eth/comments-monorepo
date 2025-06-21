import { toHex } from "viem/utils";
import { baseSepolia, anvil, type Chain } from "viem/chains";
import type { Hex } from "./core/schemas.js";

const localCommentAddressManager = "0x2dC0fb75c0Dc214C9A9b994A82AEccaCa1819f13";
const localChannelAddressManager = "0x750191e56873ff1cE36990EA52c8F0bed2e12C8b";

/**
 * The address of the `CommentManager` contract.
 * It is created using the CREATE2 opcode so should be identical across chains if no collisions occur.
 */
export const COMMENT_MANAGER_ADDRESS = (
  __DEV__
    ? localCommentAddressManager
    : "0x4a370DabF58CaE405D8B51cbd581564A750C833F"
) as Hex;

/**
 * The address of the ChannelManager contract.
 */
export const CHANNEL_MANAGER_ADDRESS = (
  __DEV__
    ? localChannelAddressManager
    : "0xA7335f11428B5AC263DfFf8BfD8925262FAfF782"
) as Hex;

export type SupportedChainConfig = {
  chain: Chain;
  commentManagerAddress: Hex;
  channelManagerAddress: Hex;
};

/**
 * The supported chains and their corresponding contract addresses.
 */
export const SUPPORTED_CHAINS = {
  [baseSepolia.id]: {
    chain: baseSepolia,
    commentManagerAddress: COMMENT_MANAGER_ADDRESS,
    channelManagerAddress: CHANNEL_MANAGER_ADDRESS,
  } as SupportedChainConfig,
  [anvil.id]: {
    chain: anvil,
    commentManagerAddress: localCommentAddressManager,
    channelManagerAddress: localChannelAddressManager,
  } as SupportedChainConfig,
} as const;

/**
 * The zero address.
 */
export const ZERO_ADDRESS = toHex(0, { size: 20 });

/**
 * The default channel ID for the CommentManager contract.
 */
export const DEFAULT_CHANNEL_ID = 0n;

/**
 * Comment type constants
 */
export const COMMENT_TYPE_COMMENT = 0;
export const COMMENT_TYPE_REACTION = 1;

/**
 * The default comment type for the `CommentManager` contract.
 */
export const DEFAULT_COMMENT_TYPE = COMMENT_TYPE_COMMENT;

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
