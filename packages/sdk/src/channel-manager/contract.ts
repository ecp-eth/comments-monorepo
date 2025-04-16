import { z } from "zod";
import { CHANNEL_MANAGER_ADDRESS, ZERO_ADDRESS } from "../constants.js";
import { HexSchema } from "../schemas/core.js";
import type { Hex } from "../types.js";
import { ChannelManagerAbi } from "../abis.js";
import type {
  AbiStateMutability,
  ContractFunctionName,
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import { isZeroHex } from "../utils.js";

type ChannelManagerAbiType = typeof ChannelManagerAbi;

export type CreateWriteContractFunction<
  TMutability extends AbiStateMutability,
  TFunctionName extends ContractFunctionName<
    ChannelManagerAbiType,
    TMutability
  >,
> = (
  args: ContractFunctionParameters<
    ChannelManagerAbiType,
    TMutability,
    TFunctionName
  >
) => Promise<Hex>;

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
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: CreateWriteContractFunction<"payable", "createChannel">;
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
  const { name, description, metadata, hook, channelManagerAddress } =
    CreateChannelParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "createChannel",
    args: [name, description, metadata, hook],
  });

  return {
    txHash,
  };
}

export type ReadChannelFromContractFunction = (
  parameters: ReadContractParameters<ChannelManagerAbiType, "getChannel">
) => Promise<ReadContractReturnType<ChannelManagerAbiType, "getChannel">>;

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
  readContract: ReadChannelFromContractFunction;
};

export type GetChannelResult = {
  name: string;
  description: string | undefined;
  metadata: string | undefined;
  hook: Hex | undefined;
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

  const [name, description, metadata, hook] = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "getChannel",
    args: [channelId],
  });

  return {
    name,
    description: !description ? undefined : description,
    metadata: !metadata ? undefined : metadata,
    hook: isZeroHex(hook) ? undefined : hook,
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
  writeContract: CreateWriteContractFunction<"nonpayable", "updateChannel">;
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
    abi: ChannelManagerAbi,
    functionName: "updateChannel",
    args: [channelId, name, description, metadata],
  });

  return {
    txHash,
  };
}

export type ReadChannelExistsFromContractFunction = (
  parameters: ReadContractParameters<ChannelManagerAbiType, "channelExists">
) => Promise<ReadContractReturnType<ChannelManagerAbiType, "channelExists">>;

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
  readContract: ReadChannelExistsFromContractFunction;
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
    abi: ChannelManagerAbi,
    functionName: "channelExists",
    args: [channelId],
  });

  return exists;
}
