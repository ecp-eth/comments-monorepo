import { toHex } from "viem/utils";
import { baseSepolia, anvil, type Chain } from "viem/chains";
import type { Hex } from "./core/schemas.js";

const localCommentAddressManager = "0x63fF6f6fe9e021Ede2d755396b327C0E6721FE47";
const localChannelAddressManager = "0xaad00608f646Da94395366472Df6Da89139b9D58";

/**
 * The address of the `CommentManager` contract.
 * It is created using the CREATE2 opcode so should be identical across chains if no collisions occur.
 */
export const COMMENT_MANAGER_ADDRESS = (
  __DEV__
    ? localCommentAddressManager
    : "0x7c21dCda31458fa13B02abAB639E9410933b1d3A"
) as Hex;

/**
 * The address of the ChannelManager contract.
 */
export const CHANNEL_MANAGER_ADDRESS = (
  __DEV__
    ? localChannelAddressManager
    : "0x704dcd45cEB7790e1Fef10871c4e7FF02E90321E"
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
