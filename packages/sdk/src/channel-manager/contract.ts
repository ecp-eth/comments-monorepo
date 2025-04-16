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

export type ReadChannelOwnerFromContractFunction = (
  parameters: ReadContractParameters<ChannelManagerAbiType, "getChannelOwner">
) => Promise<ReadContractReturnType<ChannelManagerAbiType, "getChannelOwner">>;

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
  readContract: ReadChannelOwnerFromContractFunction;
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
    abi: ChannelManagerAbi,
    functionName: "getChannelOwner",
    args: [channelId],
  });

  return {
    owner,
  };
}

export type ReadChannelCreationFeeFromContractFunction = (
  parameters: ReadContractParameters<
    ChannelManagerAbiType,
    "getChannelCreationFee"
  >
) => Promise<
  ReadContractReturnType<ChannelManagerAbiType, "getChannelCreationFee">
>;

export type GetChannelCreationFeeParams = {
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ReadChannelCreationFeeFromContractFunction;
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
    abi: ChannelManagerAbi,
    functionName: "getChannelCreationFee",
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
  writeContract: CreateWriteContractFunction<
    "nonpayable",
    "setChannelCreationFee"
  >;
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
    abi: ChannelManagerAbi,
    functionName: "setChannelCreationFee",
    args: [fee],
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

export type WithdrawFeesParams = {
  /**
   * The address of the recipient
   */
  recipient: Hex;
  /**
   * The address of the channel manager
   */
  channelManagerAddress?: Hex;
  writeContract: CreateWriteContractFunction<"nonpayable", "withdrawFees">;
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
    abi: ChannelManagerAbi,
    functionName: "withdrawFees",
    args: [recipient],
  });

  return {
    txHash,
  };
}
