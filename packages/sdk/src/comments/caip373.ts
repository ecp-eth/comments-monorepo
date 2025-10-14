import { z } from "zod";
import { type Hex, HexSchema } from "../core/schemas.js";
import { SUPPORTED_CHAINS } from "../constants.js";
import { decodeFunctionData, encodeFunctionData } from "viem";
import { CommentManagerABI } from "../abis.js";

/**
 * Base error for CAIP-373 errors
 */
export class CAIP373Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CAIP373Error";
  }
}

/**
 * Error thrown when the CAIP-373 is malformed
 */
export class MalformedCaip373Error extends CAIP373Error {
  constructor(caip373: string) {
    super(`Malformed CAIP-373: ${caip373}`);
    this.name = "MalformedCaip373Error";
  }
}

/**
 * Error thrown when the chain is unsupported
 */
export class UnsupportedChainError extends CAIP373Error {
  constructor(chainId: number) {
    super(`Unsupported chain: ${chainId}`);
    this.name = "UnsupportedChainError";
  }
}

/**
 * Error thrown when the function call data is invalid
 */
export class InvalidFunctionCallDataError extends CAIP373Error {
  constructor(functionCallData: Hex) {
    super(`Invalid function call data: ${functionCallData}`);
    this.name = "InvalidFunctionCallDataError";
  }
}

/**
 * Error thrown when the comment manager address is not the same as the chain's comment manager address
 */
export class InvalidCommentManagerAddressError extends CAIP373Error {
  constructor(commentManagerAddress: Hex, chainCommentManagerAddress: Hex) {
    super(
      `Invalid comment manager address: ${commentManagerAddress}, expected: ${chainCommentManagerAddress}`,
    );
    this.name = "InvalidCommentManagerAddressError";
  }
}

/**
 * Error thrown when the comment id is invalid
 */
export class InvalidCommentIdError extends CAIP373Error {
  constructor(commentId: Hex) {
    super(`Invalid comment id: ${commentId}`);
    this.name = "InvalidCommentIdError";
  }
}

const CAIP373_QUOTED_COMMENT_REGEX =
  /^eip155:([0-9]+):(0x[a-fA-F0-9]{40}):call:(0x[a-fA-F0-9]+)(:([0-9]+))?$/;

export type DecodedQuotedCommentFromCaip373Result = {
  commentManagerAddress: Hex;
  chainId: number;
  commentId: Hex;
  blockNumber: number | undefined;
};

/**
 * Parses a CAIP-373 quoted comment.
 *
 * This function does not validate if the comment really exists.
 *
 * See https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-373.md
 * and https://github.com/ecp-eth/ECPIP/discussions/2
 *
 * @returns The parsed quoted comment from the CAIP-373
 */
export function decodeQuotedCommentFromCaip373(
  caip373: string,
): DecodedQuotedCommentFromCaip373Result {
  const match = caip373.match(CAIP373_QUOTED_COMMENT_REGEX);

  if (!match) {
    throw new MalformedCaip373Error(caip373);
  }

  const parseResult = z
    .object({
      chainId: z.coerce.number().int(),
      commentManagerAddress: HexSchema,
      functionCallData: HexSchema,
      blockNumber: z.coerce.number().int().optional(),
    })
    .safeParse({
      chainId: match[1],
      commentManagerAddress: match[2],
      functionCallData: match[3],
      blockNumber: match[5],
    });

  if (!parseResult.success) {
    throw new MalformedCaip373Error(caip373);
  }

  const { chainId, commentManagerAddress, functionCallData, blockNumber } =
    parseResult.data;

  const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];

  if (!chain) {
    throw new UnsupportedChainError(chainId);
  }

  if (
    commentManagerAddress.toLowerCase() !==
    chain.commentManagerAddress.toLowerCase()
  ) {
    throw new InvalidCommentManagerAddressError(
      commentManagerAddress,
      chain.commentManagerAddress,
    );
  }

  const decoded = decodeFunctionData({
    abi: CommentManagerABI,
    data: functionCallData,
  });

  if (decoded.functionName !== "getComment") {
    throw new InvalidFunctionCallDataError(functionCallData);
  }

  return {
    commentManagerAddress,
    chainId,
    commentId: decoded.args[0],
    blockNumber,
  };
}

export type CAIP373QuotedComment =
  | `eip155:${number}:${Hex}:call:${Hex}`
  | `eip155:${number}:${Hex}:call:${Hex}:${number}`;

/**
 * Encodes a quoted comment from a CAIP-373
 *
 * See https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-373.md
 * and https://github.com/ecp-eth/ECPIP/discussions/2
 *
 * @returns The encoded quoted comment from the CAIP-373
 */
export function encodeQuotedCommentFromCaip373({
  chainId,
  commentId,
  blockNumber,
}: {
  chainId: number;
  commentId: Hex;
  blockNumber?: number;
}): CAIP373QuotedComment {
  const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];

  if (!chain) {
    throw new UnsupportedChainError(chainId);
  }

  const commentIdParseResult = HexSchema.safeParse(commentId);

  if (!commentIdParseResult.success) {
    throw new InvalidCommentIdError(commentId);
  }

  const encodedFunctionCall = encodeFunctionData({
    abi: CommentManagerABI,
    functionName: "getComment",
    args: [commentId],
  });

  return `eip155:${chainId}:${chain.commentManagerAddress}:call:${encodedFunctionCall}${blockNumber != null ? `:${blockNumber}` : ""}`;
}
