import { z } from "zod";
import { CHANNEL_MANAGER_ADDRESS, ZERO_ADDRESS } from "../constants.js";
import { HexSchema } from "../core/schemas.js";
import type { Hex } from "../core/schemas.js";
import { ChannelManagerABI } from "../abis.js";
import { isZeroHex } from "../core/utils.js";
import type { ContractWriteFunctions, ContractReadFunctions } from "./types.js";

export type ChannelPermissions = {
  afterInitialize: boolean;
  afterComment: boolean;
  afterDeleteComment: boolean;
};

export type CreateChannelParams = {
  /**
   * The name of the channel
   */
  name: string;
  /**
   * The description of the channel
   */
  description?: string;
  /**
   * The metadata of the channel
   */
  metadata?: string;
  /**
   * The hook of the channel
   */
  hook?: Hex;
  /**
   * The fee for creating the channel this will be paid in the ETH by the caller.
   */
  fee?: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["createChannel"];
};

export type CreateChannelResult = {
  txHash: Hex;
};

const CreateChannelParamsSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  metadata: z.string().default(""),
  hook: HexSchema.default(ZERO_ADDRESS),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  fee: z.bigint().min(0n).optional(),
});

/**
 * Create a new channel
 *
 * @param params - The parameters for creating a new channel
 * @returns The transaction hash of the created channel
 */
export async function createChannel(
  params: CreateChannelParams
): Promise<CreateChannelResult> {
  const { name, description, metadata, hook, channelManagerAddress, fee } =
    CreateChannelParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "createChannel",
    args: [name, description, metadata, hook],
    value: fee,
  });

  return {
    txHash,
  };
}

export type GetChannelParams = {
  /**
   * The ID of the channel to get
   */
  channelId: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["getChannel"];
};

export type GetChannelResult = {
  name: string;
  description: string | undefined;
  metadata: string | undefined;
  hook: Hex | undefined;
  permissions: ChannelPermissions;
};

const GetChannelParamsSchema = z.object({
  channelId: z.bigint(),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get a channel
 *
 * @param params - The parameters for getting a channel
 * @throws If the channel does not exist
 * @returns The channel
 */
export async function getChannel(
  params: GetChannelParams
): Promise<GetChannelResult> {
  const { channelId, channelManagerAddress } =
    GetChannelParamsSchema.parse(params);

  const { name, description, metadata, hook, permissions } =
    await params.readContract({
      address: channelManagerAddress,
      abi: ChannelManagerABI,
      functionName: "getChannel",
      args: [channelId],
    });

  return {
    name,
    description: !description ? undefined : description,
    metadata: !metadata ? undefined : metadata,
    hook: isZeroHex(hook) ? undefined : hook,
    permissions,
  };
}

export type UpdateChannelParams = {
  /**
   * The ID of the channel to update
   */
  channelId: bigint;
  /**
   * The name of the channel
   */
  name: string;
  /**
   * The description of the channel
   */
  description?: string;
  /**
   * The metadata of the channel
   */
  metadata?: string;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["updateChannel"];
};

export type UpdateChannelResult = {
  txHash: Hex;
};

const UpdateChannelParamsSchema = z.object({
  channelId: z.bigint(),
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  metadata: z.string().default(""),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Update a channel
 *
 * @param params - The parameters for updating a channel
 * @returns The transaction hash of the updated channel
 */
export async function updateChannel(
  params: UpdateChannelParams
): Promise<UpdateChannelResult> {
  const { channelId, name, description, metadata, channelManagerAddress } =
    UpdateChannelParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "updateChannel",
    args: [channelId, name, description, metadata],
  });

  return {
    txHash,
  };
}

export type ChannelExistsParams = {
  /**
   * The ID of the channel to check
   */
  channelId: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["channelExists"];
};

const ChannelExistsParamsSchema = z.object({
  channelId: z.bigint(),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Check if a channel exists
 *
 * @param params - The parameters for checking if a channel exists
 * @returns Whether the channel exists
 */
export async function channelExists(
  params: ChannelExistsParams
): Promise<boolean> {
  const { channelId, channelManagerAddress } =
    ChannelExistsParamsSchema.parse(params);

  const exists = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "channelExists",
    args: [channelId],
  });

  return exists;
}

export type GetChannelOwnerParams = {
  /**
   * The ID of the channel to get the owner of
   */
  channelId: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["getChannelOwner"];
};

export type GetChannelOwnerResult = {
  owner: Hex;
};

const GetChannelOwnerParamsSchema = z.object({
  channelId: z.bigint(),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get the owner of a channel
 *
 * @param params - The parameters for getting the owner of a channel
 * @returns The owner of the channel
 */
export async function getChannelOwner(
  params: GetChannelOwnerParams
): Promise<GetChannelOwnerResult> {
  const { channelId, channelManagerAddress } =
    GetChannelOwnerParamsSchema.parse(params);

  const owner = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "getChannelOwner",
    args: [channelId],
  });

  return {
    owner,
  };
}

export type GetChannelCreationFeeParams = {
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["getChannelCreationFee"];
};

export type GetChannelCreationFeeResult = {
  fee: bigint;
};

const GetChannelCreationFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get the creation fee from channel manager
 *
 * @param params - The parameters for getting the creation fee from channel manager
 * @returns The creation fee from channel manager
 */
export async function getChannelCreationFee(
  params: GetChannelCreationFeeParams
): Promise<GetChannelCreationFeeResult> {
  const { channelManagerAddress } =
    GetChannelCreationFeeParamsSchema.parse(params);

  const fee = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "getChannelCreationFee",
    args: [],
  });

  return { fee };
}

export type SetChannelCreationFeeParams = {
  /**
   * The fee for creating a channel in wei
   */
  fee: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["setChannelCreationFee"];
};

export type SetChannelCreationFeeResult = {
  txHash: Hex;
};

const SetChannelCreationFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  fee: z.bigint().min(0n),
});

/**
 * Set the fee for creating a new channel
 *
 * @param params - The parameters for setting the fee for creating a new channel
 * @returns The transaction hash of the set creation fee
 */
export async function setChannelCreationFee(
  params: SetChannelCreationFeeParams
): Promise<SetChannelCreationFeeResult> {
  const { channelManagerAddress, fee } =
    SetChannelCreationFeeParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "setChannelCreationFee",
    args: [fee],
  });

  return {
    txHash,
  };
}

export type WithdrawFeesParams = {
  /**
   * The address of the recipient
   */
  recipient: Hex;
  /**
   * The address of the channel manager
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["withdrawFees"];
};

export type WithdrawFeesResult = {
  txHash: Hex;
};

const WithdrawFeesParamsSchema = z.object({
  recipient: HexSchema,
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Withdraws accumulated fees to a specified address
 *
 * @param params - The parameters for withdrawing accumulated fees
 * @returns The transaction hash of the withdrawal
 */
export async function withdrawFees(
  params: WithdrawFeesParams
): Promise<WithdrawFeesResult> {
  const { recipient, channelManagerAddress } =
    WithdrawFeesParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "withdrawFees",
    args: [recipient],
  });

  return {
    txHash,
  };
}

export type UpdateCommentsContractParams = {
  /**
   * The address of the new comments contract
   */
  commentsContract: Hex;
  /**
   * The address of the channel manager
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["updateCommentsContract"];
};

export type UpdateCommentsContractResult = {
  txHash: Hex;
};

const UpdateCommentsContractParamsSchema = z.object({
  commentsContract: HexSchema,
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Updates the comments contract address
 *
 * @param params - The parameters for updating the comments contract address
 * @returns The transaction hash of the updated comments contract address
 */
export async function updateCommentsContract(
  params: UpdateCommentsContractParams
): Promise<UpdateCommentsContractResult> {
  const { commentsContract, channelManagerAddress } =
    UpdateCommentsContractParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "updateCommentsContract",
    args: [commentsContract],
  });

  return {
    txHash,
  };
}

export type SetBaseURIParams = {
  /**
   * The new base URI for NFT metadata
   */
  baseURI: string;
  /**
   * The address of the channel manager
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["setBaseURI"];
};

export type SetBaseURIResult = {
  txHash: Hex;
};

const SetBaseURIParamsSchema = z.object({
  baseURI: z.string().min(1),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Sets the base URI for NFT metadata
 *
 * @param params - The parameters for setting the base URI for NFT metadata
 * @returns The transaction hash of the set base URI
 */
export async function setBaseURI(
  params: SetBaseURIParams
): Promise<SetBaseURIResult> {
  const { baseURI, channelManagerAddress } =
    SetBaseURIParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "setBaseURI",
    args: [baseURI],
  });

  return {
    txHash,
  };
}
