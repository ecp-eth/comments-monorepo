import { z } from "zod/v3";
import { CHANNEL_MANAGER_ADDRESS } from "../constants.js";
import { ChannelManagerABI } from "../abis.js";
import type { ContractWriteFunctions, ContractReadFunctions } from "./types.js";
import { type Hex, HexSchema } from "../core/schemas.js";

export type SetHookParams = {
  /**
   * The ID of the channel to set the hook for
   */
  channelId: bigint;
  /**
   * The address of the hook to set
   */
  hook: Hex;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["setHook"];
};

export type SetHookResult = {
  txHash: Hex;
};

const SetHookParamsSchema = z.object({
  channelId: z.bigint(),
  hook: HexSchema,
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Set the hook for a channel
 *
 * @param params - The parameters for setting the hook for a channel
 * @returns The transaction hash of the set hook
 */
export async function setHook(params: SetHookParams): Promise<SetHookResult> {
  const { channelId, hook, channelManagerAddress } =
    SetHookParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "setHook",
    args: [channelId, hook],
  });

  return {
    txHash,
  };
}

export type GetHookTransactionFeeParams = {
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["getHookTransactionFee"];
};

export type GetHookTransactionFeeResult = {
  fee: number;
};

const GetHookTransactionFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get the hook transaction fee from channel manager
 *
 * @param params - The parameters for getting the hook transaction fee from channel manager
 * @returns The hook transaction fee from channel manager
 */
export async function getHookTransactionFee(
  params: GetHookTransactionFeeParams,
): Promise<GetHookTransactionFeeResult> {
  const { channelManagerAddress } =
    GetHookTransactionFeeParamsSchema.parse(params);

  const fee = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "getHookTransactionFee",
  });

  return { fee };
}

export type SetHookTransactionFeeParams = {
  /**
   * The fee for the hook transaction in basis points (0.01% = 1 point)
   */
  feeBasisPoints: number;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["setHookTransactionFee"];
};

export type SetHookTransactionFeeResult = {
  txHash: Hex;
};

const SetHookTransactionFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  feeBasisPoints: z.number().int().min(0).max(10000),
});

/**
 * Set the percentage of the fee for the hook transaction
 *
 * @param params - The parameters for setting the fee for the hook transaction
 * @returns The transaction hash of the set hook transaction fee
 */
export async function setHookTransactionFee(
  params: SetHookTransactionFeeParams,
): Promise<SetHookTransactionFeeResult> {
  const { channelManagerAddress, feeBasisPoints } =
    SetHookTransactionFeeParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "setHookTransactionFee",
    args: [feeBasisPoints],
  });

  return {
    txHash,
  };
}

export type DeductProtocolHookTransactionFeeParams = {
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["deductProtocolHookTransactionFee"];
};

export type DeductProtocolHookTransactionFeeResult = {
  deductedFee: bigint;
};

const DeductProtocolHookTransactionFeeParamsSchema = z.object({
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  /**
   * The total value sent with the transaction
   */
  value: z.bigint(),
});

/**
 * Calculates the hook transaction fee by deducting the protocol fee
 *
 * @param params - The total value sent with the transaction
 * @returns The amount that should be passed to the hook
 */
export async function deductProtocolHookTransactionFee(
  params: DeductProtocolHookTransactionFeeParams,
): Promise<DeductProtocolHookTransactionFeeResult> {
  const { channelManagerAddress, value } =
    DeductProtocolHookTransactionFeeParamsSchema.parse(params);

  const deductedFee = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "deductProtocolHookTransactionFee",
    args: [value],
  });

  return { deductedFee };
}
