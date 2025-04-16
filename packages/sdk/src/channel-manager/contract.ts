import { z } from "zod";
import { CHANNEL_MANAGER_ADDRESS, ZERO_ADDRESS } from "../constants.js";
import { HexSchema } from "../schemas/core.js";
import type { Hex } from "../types.js";
import { ChannelManagerAbi } from "../abis.js";
import type {
  AbiStateMutability,
  ContractFunctionName,
  ContractFunctionParameters,
} from "viem";

export type CreateWriteContractFunction<
  TMutability extends AbiStateMutability,
  TFunctionName extends ContractFunctionName<
    typeof ChannelManagerAbi,
    TMutability
  >,
> = (
  args: ContractFunctionParameters<
    typeof ChannelManagerAbi,
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
