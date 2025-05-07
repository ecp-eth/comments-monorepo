import { z } from "zod";
import { CHANNEL_MANAGER_ADDRESS } from "../constants.js";
import {
  CommentInputDataSchema,
  type CommentInputData,
} from "../comments/schemas.js";
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
  params: GetHookTransactionFeeParams
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
  params: SetHookTransactionFeeParams
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

export type ExecuteHookParams = {
  /**
   * The ID of the channel to execute hooks for
   */
  channelId: bigint;
  /**
   * The comment data to process
   */
  commentData: CommentInputData;
  /**
   * The address that initiated the transaction
   */
  caller: Hex;
  /**
   * The unique identifier of the comment
   */
  commentId: Hex;
  /**
   * The phase of hook execution (Before or After)
   */
  phase: "Before" | "After";
  /**
   * The value to send with the transaction
   */
  value?: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["executeHook"];
};

export type ExecuteHookResult = {
  txHash: Hex;
};

const ExecuteHookParamsSchema = z.object({
  channelId: z.bigint(),
  commentData: CommentInputDataSchema,
  caller: HexSchema,
  commentId: HexSchema,
  phase: z.enum(["Before", "After"]),
  value: z.bigint().min(0n).optional(),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Execute hooks for a channel
 *
 * @param params - The parameters for executing hooks
 * @returns The transaction hash of the hook execution
 */
export async function executeHook(
  params: ExecuteHookParams
): Promise<ExecuteHookResult> {
  const {
    channelId,
    commentData,
    caller,
    commentId,
    phase,
    value,
    channelManagerAddress,
  } = ExecuteHookParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "executeHook",
    args: [
      channelId,
      commentData,
      caller,
      commentId,
      phase === "Before" ? 0 : 1,
    ],
    value,
  });

  return {
    txHash,
  };
}

export type CalculateHookTransactionFeeParams = {
  /**
   * The total value to calculate fee for
   */
  value: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["calculateHookTransactionFee"];
};

export type CalculateHookTransactionFeeResult = {
  txHash: Hex;
  hookValue: bigint;
};

const CalculateHookTransactionFeeParamsSchema = z.object({
  value: z.bigint().min(0n),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Calculates the hook transaction fee and returns the hook value after deducting the protocol fee.
 * If the value is 0 or if the hook transaction fee percentage is 0, returns the original value.
 *
 * @param params - The parameters for calculating the hook transaction fee
 * @returns The transaction hash and the hook value after fee deduction
 */
export async function calculateHookTransactionFee(
  params: CalculateHookTransactionFeeParams
): Promise<CalculateHookTransactionFeeResult> {
  const { value, channelManagerAddress } =
    CalculateHookTransactionFeeParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "calculateHookTransactionFee",
    args: [value],
  });

  return {
    txHash,
    hookValue: value,
  };
}
