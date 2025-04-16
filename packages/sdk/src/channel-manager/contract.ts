import { z } from "zod";
import { CHANNEL_MANAGER_ADDRESS, ZERO_ADDRESS } from "../constants.js";
import { HexSchema } from "../schemas/core.js";
import type { Hex } from "../types.js";
import { ChannelManagerAbi } from "../abis.js";
import type { ContractFunctionParameters } from "viem";

type WriteContractFunction = (
  args: ContractFunctionParameters<
    typeof ChannelManagerAbi,
    "payable",
    "createChannel"
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
  writeContract: WriteContractFunction;
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
