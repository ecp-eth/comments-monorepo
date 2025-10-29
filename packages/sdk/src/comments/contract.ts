import { z } from "zod/v3";
import { COMMENT_MANAGER_ADDRESS } from "../constants.js";
import { type Hex, HexSchema } from "../core/schemas.js";
import { CommentManagerABI } from "../abis.js";
import type { ContractWriteFunctions, ContractReadFunctions } from "./types.js";

export type UpdateChannelContractParams = {
  /**
   * The new channel manager contract address
   */
  channelContract: Hex;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsContractAddress?: Hex;
  writeContract: ContractWriteFunctions["updateChannelContract"];
};

export type UpdateChannelContractResult = {
  txHash: Hex;
};

const UpdateChannelContractParamsSchema = z.object({
  channelContract: HexSchema,
  commentsContractAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Updates the channel manager contract address (only owner)
 *
 * @param params - The parameters for updating the channel contract
 * @returns The transaction hash
 */
export async function updateChannelContract(
  params: UpdateChannelContractParams,
): Promise<UpdateChannelContractResult> {
  const { channelContract, commentsContractAddress } =
    UpdateChannelContractParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: commentsContractAddress,
    abi: CommentManagerABI,
    functionName: "updateChannelContract",
    args: [channelContract],
  });

  return {
    txHash,
  };
}

export type GetContractNameParams = {
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsContractAddress?: Hex;
  readContract: ContractReadFunctions["name"];
};

const GetContractNameParamsSchema = z.object({
  commentsContractAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Gets the contract name
 *
 * @param params - The parameters for getting the contract name
 * @returns The contract name
 */
export async function getContractName(
  params: GetContractNameParams,
): Promise<string> {
  const { commentsContractAddress } = GetContractNameParamsSchema.parse(params);

  const name = await params.readContract({
    address: commentsContractAddress,
    abi: CommentManagerABI,
    functionName: "name",
  });

  return name;
}

export type GetContractVersionParams = {
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsContractAddress?: Hex;
  readContract: ContractReadFunctions["version"];
};

const GetContractVersionParamsSchema = z.object({
  commentsContractAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Gets the contract version
 *
 * @param params - The parameters for getting the contract version
 * @returns The contract version
 */
export async function getContractVersion(
  params: GetContractVersionParams,
): Promise<string> {
  const { commentsContractAddress } =
    GetContractVersionParamsSchema.parse(params);

  const version = await params.readContract({
    address: commentsContractAddress,
    abi: CommentManagerABI,
    functionName: "version",
  });

  return version;
}

export type GetDomainSeparatorParams = {
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsContractAddress?: Hex;
  readContract: ContractReadFunctions["DOMAIN_SEPARATOR"];
};

const GetDomainSeparatorParamsSchema = z.object({
  commentsContractAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Gets the EIP-712 domain separator
 *
 * @param params - The parameters for getting the domain separator
 * @returns The domain separator
 */
export async function getDomainSeparator(
  params: GetDomainSeparatorParams,
): Promise<Hex> {
  const { commentsContractAddress } =
    GetDomainSeparatorParamsSchema.parse(params);

  const domainSeparator = await params.readContract({
    address: commentsContractAddress,
    abi: CommentManagerABI,
    functionName: "DOMAIN_SEPARATOR",
  });

  return domainSeparator;
}

export type GetChannelManagerParams = {
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsContractAddress?: Hex;
  readContract: ContractReadFunctions["channelManager"];
};

const GetChannelManagerParamsSchema = z.object({
  commentsContractAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Gets the channel manager contract address
 *
 * @param params - The parameters for getting the channel manager
 * @returns The channel manager contract address
 */
export async function getChannelManager(
  params: GetChannelManagerParams,
): Promise<Hex> {
  const { commentsContractAddress } =
    GetChannelManagerParamsSchema.parse(params);

  const channelManager = await params.readContract({
    address: commentsContractAddress,
    abi: CommentManagerABI,
    functionName: "channelManager",
  });

  return channelManager;
}
