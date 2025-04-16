import { z } from "zod";
import { CHANNEL_MANAGER_ADDRESS } from "../constants.js";
import { HexSchema } from "../schemas/core.js";
import type { Hex } from "../types.js";
import { ChannelManagerAbi } from "../abis.js";
import type { ReadContractParameters, ReadContractReturnType } from "viem";
import type {
  CreateWriteContractFunction,
  ChannelManagerAbiType,
} from "./types.js";

export type ReadHookStatusFromContractFunction = (
  parameters: ReadContractParameters<ChannelManagerAbiType, "getHookStatus">
) => Promise<ReadContractReturnType<ChannelManagerAbiType, "getHookStatus">>;

export type GetHookStatusParams = {
  /**
   * The address of the hook
   */
  hookAddress: Hex;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ReadHookStatusFromContractFunction;
};

export type GetHookStatusResult = {
  registered: boolean;
  enabled: boolean;
};

const GetHookStatusParamsSchema = z.object({
  hookAddress: HexSchema,
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get the status of a hook
 *
 * @param params - The parameters for getting the status of a hook
 * @returns The status of the hook
 */
export async function getHookStatus(
  params: GetHookStatusParams
): Promise<GetHookStatusResult> {
  const { hookAddress, channelManagerAddress } =
    GetHookStatusParamsSchema.parse(params);

  const [registered, enabled] = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "getHookStatus",
    args: [hookAddress],
  });

  return {
    registered,
    enabled,
  };
}

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
  writeContract: CreateWriteContractFunction<"nonpayable", "setHook">;
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
    abi: ChannelManagerAbi,
    functionName: "setHook",
    args: [channelId, hook],
  });

  return {
    txHash,
  };
}

export type RegisterHookParams = {
  /**
   * The address of the hook to register
   */
  hookAddress: Hex;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: CreateWriteContractFunction<"payable", "registerHook">;
};

export type RegisterHookResult = {
  txHash: Hex;
};

const RegisterHookParamsSchema = z.object({
  hookAddress: HexSchema,
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Register a hook into a global registry
 *
 * @param params - The parameters for registering a hook
 * @returns The transaction hash of the registered hook
 */
export async function registerHook(
  params: RegisterHookParams
): Promise<RegisterHookResult> {
  const { hookAddress, channelManagerAddress } =
    RegisterHookParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "registerHook",
    args: [hookAddress],
  });

  return {
    txHash,
  };
}

export type SetHookGloballyEnabledParams = {
  /**
   * The address of the hook to set the globally enabled status of
   */
  hookAddress: Hex;
  /**
   * Whether the hook should be enabled
   */
  enabled: boolean;
  /**
   * The address of the channel manager
   */
  channelManagerAddress?: Hex;
  writeContract: CreateWriteContractFunction<
    "nonpayable",
    "setHookGloballyEnabled"
  >;
};

export type SetHookGloballyEnabledResult = {
  txHash: Hex;
};

const SetHookGloballyEnabledParamsSchema = z.object({
  hookAddress: HexSchema,
  enabled: z.boolean(),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Enables or disables a hook globally
 *
 * @param params - The parameters for enabling or disabling a hook globally
 * @returns The transaction hash of the set globally enabled status
 */
export async function setHookGloballyEnabled(
  params: SetHookGloballyEnabledParams
): Promise<SetHookGloballyEnabledResult> {
  const { hookAddress, enabled, channelManagerAddress } =
    SetHookGloballyEnabledParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "setHookGloballyEnabled",
    args: [hookAddress, enabled],
  });

  return {
    txHash,
  };
}

export type ReadHookRegistrationFeeFromContractFunction = (
  parameters: ReadContractParameters<
    ChannelManagerAbiType,
    "getHookRegistrationFee"
  >
) => Promise<
  ReadContractReturnType<ChannelManagerAbiType, "getHookRegistrationFee">
>;

export type GetHookRegistrationFeeParams = {
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ReadHookRegistrationFeeFromContractFunction;
};

export type GetHookRegistrationFeeResult = {
  fee: bigint;
};

const GetHookRegistrationFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get the fee for registering a new hook
 *
 * @param params - The parameters for getting the fee for registering a new hook
 * @returns The fee for registering a new hook
 */
export async function getHookRegistrationFee(
  params: GetHookRegistrationFeeParams
): Promise<GetHookRegistrationFeeResult> {
  const { channelManagerAddress } =
    GetHookRegistrationFeeParamsSchema.parse(params);

  const fee = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "getHookRegistrationFee",
  });

  return { fee };
}

export type SetHookRegistrationFeeParams = {
  /**
   * The fee for registering a hook in wei
   */
  fee: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: CreateWriteContractFunction<
    "nonpayable",
    "setHookRegistrationFee"
  >;
};

export type SetHookRegistrationFeeResult = {
  txHash: Hex;
};

const SetHookRegistrationFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  fee: z.bigint().min(0n),
});

/**
 * Set the fee for registering a new hook
 *
 * @param params - The parameters for setting the fee for registering a new hook
 * @returns The transaction hash of the set registration fee
 */
export async function setHookRegistrationFee(
  params: SetHookRegistrationFeeParams
): Promise<SetHookRegistrationFeeResult> {
  const { channelManagerAddress, fee } =
    SetHookRegistrationFeeParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "setHookRegistrationFee",
    args: [fee],
  });

  return {
    txHash,
  };
}

export type ReadHookTransactionFeeFromContractFunction = (
  parameters: ReadContractParameters<
    ChannelManagerAbiType,
    "getHookTransactionFee"
  >
) => Promise<
  ReadContractReturnType<ChannelManagerAbiType, "getHookTransactionFee">
>;

export type GetHookTransactionFeeParams = {
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ReadHookTransactionFeeFromContractFunction;
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
    abi: ChannelManagerAbi,
    functionName: "getHookTransactionFee",
  });

  return { fee };
}

export type SetHookTransactionFeeParams = {
  /**
   * The fee for the hook transaction in basis points (1% = 100)
   */
  feePercentage: number;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: CreateWriteContractFunction<
    "nonpayable",
    "setHookTransactionFee"
  >;
};

export type SetHookTransactionFeeResult = {
  txHash: Hex;
};

const SetHookTransactionFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  feePercentage: z.number().int().min(0).max(10000),
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
  const { channelManagerAddress, feePercentage } =
    SetHookTransactionFeeParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerAbi,
    functionName: "setHookTransactionFee",
    args: [feePercentage],
  });

  return {
    txHash,
  };
}
