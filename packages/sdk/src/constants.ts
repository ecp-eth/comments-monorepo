import { toHex } from "viem/utils";
import { baseSepolia, anvil, type Chain } from "viem/chains";
import type { Hex } from "./core/schemas.js";

const localCommentAddressManager = "0x84b7dfda028200E371f659A599A5b84cAEC00D57";
const localChannelAddressManager = "0x49b2Fd1Df50dAdb0204EF38d6d5ddF57eAe5A771";

/**
 * The address of the `CommentManager` contract.
 * It is created using the CREATE2 opcode so should be identical across chains if no collisions occur.
 */
export const COMMENT_MANAGER_ADDRESS = (
  __DEV__
    ? localCommentAddressManager
    : "0xB4Fafb3495aA5cdEdF30DAAC2A9d45523E19054b"
) as Hex;

/**
 * The address of the ChannelManager contract.
 */
export const CHANNEL_MANAGER_ADDRESS = (
  __DEV__
    ? localChannelAddressManager
    : "0x4dE1D6cB21BF8f3a3b087175060e00E5D16777C4"
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
