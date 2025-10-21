import { z } from "zod";
import {
  CHANNEL_MANAGER_ADDRESS,
  COMMENT_TYPE_COMMENT,
  DEFAULT_CHANNEL_ID,
  DEFAULT_COMMENT_TYPE,
  EMPTY_PARENT_ID,
  NATIVE_ASSET_ADDRESS,
  ZERO_ADDRESS,
} from "../constants.js";
import { HexSchema } from "../core/schemas.js";
import type { Hex } from "../core/schemas.js";
import type {
  WaitableWriteContractHelperResult,
  WriteContractHelperResult,
} from "../core/types.js";
import { BaseHookABI, ChannelManagerABI } from "../abis.js";
import {
  createWaitableWriteContractHelper,
  getOneMinuteFromNowInSeconds,
  isZeroHex,
} from "../core/utils.js";
import type {
  ContractWriteFunctions,
  ContractReadFunctions,
  ChannelManagerABIType,
  Channel,
  HookContractReadFunctions,
  HookFeeEstimation,
  TotalFeeEstimation,
  ContractBasedAssetType,
} from "./types.js";
import {
  AuthorAuthMethod,
  type CommentData,
  type MetadataEntry,
  type MetadataEntryOp,
} from "../comments/types.js";
import {
  MetadataArrayOpSchema,
  MetadataEntrySchema,
} from "../comments/schemas.js";
import { getHookTransactionFee } from "./hook.js";
import type {
  ERC165ContractReadFunctions,
  ERC20ContractReadFunctions,
  LegacyTakesChannelContractReadFunctions,
} from "../types.js";
import { getERCType } from "./utils.js";
import { LEGACY_TAKES_CHANNEL_ABI } from "../extraABIs.js";
import { ContractFunctionExecutionError, type PartialBy } from "viem";

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
  metadata?: MetadataEntry[];
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

export type CreateChannelResult = WaitableWriteContractHelperResult<
  ChannelManagerABIType,
  "ChannelCreated"
>;

const CreateChannelParamsSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  metadata: z.array(MetadataEntrySchema).default([]),
  hook: HexSchema.default(ZERO_ADDRESS),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  fee: z.bigint().min(0n).optional(),
});

/**
 * Create a new channel
 *
 * @returns The transaction hash of the created channel
 */
export const createChannel = createWaitableWriteContractHelper(
  async (params: CreateChannelParams): Promise<WriteContractHelperResult> => {
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
  },
  {
    abi: ChannelManagerABI,
    eventName: "ChannelCreated",
  },
);

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

export type GetChannelResult = Omit<Channel, "metadata">;

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
  params: GetChannelParams,
): Promise<GetChannelResult> {
  const { channelId, channelManagerAddress } =
    GetChannelParamsSchema.parse(params);

  const { name, description, hook, permissions } = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "getChannel",
    args: [channelId],
  });

  return {
    name,
    description: !description ? undefined : description,
    hook: isZeroHex(hook) ? undefined : hook,
    permissions,
  };
}

export type GetChannelMetadataParams = {
  /**
   * The ID of the channel to get metadata for
   */
  channelId: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["getChannelMetadata"];
};

export type GetChannelMetadataResult = {
  metadata: MetadataEntry[];
};

const GetChannelMetadataParamsSchema = z.object({
  channelId: z.bigint(),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get channel metadata
 *
 * @param params - The parameters for getting channel metadata
 * @throws If the channel does not exist
 * @returns The channel metadata
 */
export async function getChannelMetadata(
  params: GetChannelMetadataParams,
): Promise<GetChannelMetadataResult> {
  const { channelId, channelManagerAddress } =
    GetChannelMetadataParamsSchema.parse(params);

  const metadata = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "getChannelMetadata",
    args: [channelId],
  });

  return {
    metadata: metadata as MetadataEntry[],
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
  metadata?: MetadataEntryOp[];
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["updateChannel"];
};

export type UpdateChannelResult = WaitableWriteContractHelperResult<
  ChannelManagerABIType,
  "ChannelUpdated"
>;

const UpdateChannelParamsSchema = z.object({
  channelId: z.bigint(),
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  metadata: MetadataArrayOpSchema.default([]),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Update a channel
 *
 * @returns The transaction hash of the updated channel
 */
export const updateChannel = createWaitableWriteContractHelper(
  async (params: UpdateChannelParams): Promise<WriteContractHelperResult> => {
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
  },
  {
    abi: ChannelManagerABI,
    eventName: "ChannelUpdated",
  },
);

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
  params: ChannelExistsParams,
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

export type OwnerOfParams = {
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
  readContract: ContractReadFunctions["ownerOf"];
};

export type OwnerOfResult = {
  owner: Hex;
};

const OwnerOfParamsSchema = z.object({
  channelId: z.bigint(),
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get the owner of a channel
 *
 * @param params - The parameters for getting the owner of a channel
 * @returns The owner of the channel
 */
export async function ownerOf(params: OwnerOfParams): Promise<OwnerOfResult> {
  const { channelId, channelManagerAddress } =
    OwnerOfParamsSchema.parse(params);

  const owner = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "ownerOf",
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
  params: GetChannelCreationFeeParams,
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
  params: SetChannelCreationFeeParams,
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

export type GetCommentCreationFeeParams = {
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  readContract: ContractReadFunctions["getCommentCreationFee"];
};

export type GetCommentCreationFeeResult = {
  fee: bigint;
};

const GetCommentCreationFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
});

/**
 * Get the creation fee from channel manager
 *
 * @param params - The parameters for getting the creation fee from channel manager
 * @returns The creation fee from channel manager
 */
export async function getCommentCreationFee(
  params: GetCommentCreationFeeParams,
): Promise<GetCommentCreationFeeResult> {
  const { channelManagerAddress } =
    GetCommentCreationFeeParamsSchema.parse(params);

  const fee = await params.readContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "getCommentCreationFee",
    args: [],
  });

  return { fee };
}

export type SetCommentCreationFeeParams = {
  /**
   * The fee for creating a comment in wei
   */
  fee: bigint;
  /**
   * The address of the channel manager
   *
   * @default CHANNEL_MANAGER_ADDRESS
   */
  channelManagerAddress?: Hex;
  writeContract: ContractWriteFunctions["setCommentCreationFee"];
};

export type SetCommentCreationFeeResult = {
  txHash: Hex;
};

const SetCommentCreationFeeParamsSchema = z.object({
  channelManagerAddress: HexSchema.default(CHANNEL_MANAGER_ADDRESS),
  fee: z.bigint().min(0n),
});

/**
 * Set the fee for creating a new comment
 *
 * @param params - The parameters for setting the fee for creating a new comment
 * @returns The transaction hash of the set creation fee
 */
export async function setCommentCreationFee(
  params: SetCommentCreationFeeParams,
): Promise<SetCommentCreationFeeResult> {
  const { channelManagerAddress, fee } =
    SetCommentCreationFeeParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: channelManagerAddress,
    abi: ChannelManagerABI,
    functionName: "setCommentCreationFee",
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
  params: WithdrawFeesParams,
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
  params: SetBaseURIParams,
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

type GetEstimatedChannelPostCommentHookFeeParams = {
  channelId: bigint;
  commentData: CommentData;
  metadata: MetadataEntry[];
  msgSender: Hex;
  readContract: HookContractReadFunctions["estimateAddCommentFee"] &
    ContractReadFunctions["getChannel"] &
    LegacyTakesChannelContractReadFunctions["commentFee"];
  channelManagerAddress?: Hex;
};

/**
 * It calls the `estimateAddCommentFee` function on the hook to retrieve the estimated fee for posting a comment to a channel.
 * It also tries to probe if the hook is any known legacy hook and return corresponding fee estimation.
 * For estimation of total fee, use the `estimateChannelPostCommentFee` helper
 *
 * @param getEstimatedChannelPostCommentHookFeeParams - The parameters for estimating the fee for posting a comment to a channel
 * @returns The estimated fee for posting a comment to a channel
 */
export async function getEstimatedChannelPostCommentHookFee({
  channelId,
  commentData,
  metadata,
  msgSender,
  readContract,
  channelManagerAddress,
}: GetEstimatedChannelPostCommentHookFeeParams): Promise<HookFeeEstimation> {
  const channelInfo = await getChannel({
    channelId,
    channelManagerAddress,
    readContract: readContract,
  });

  if (!channelInfo.hook) {
    return {
      amount: 0n,
      asset: NATIVE_ASSET_ADDRESS,
      description: "",
      metadata: [],
      hook: ZERO_ADDRESS,
    };
  }

  let estimation: HookFeeEstimation | undefined;
  try {
    estimation = {
      ...(await readContract({
        abi: BaseHookABI,
        address: channelInfo.hook,
        functionName: "estimateAddCommentFee",
        args: [commentData, metadata, msgSender],
      })),
      hook: channelInfo.hook,
    };
  } catch (error) {
    if (!(error instanceof ContractFunctionExecutionError)) {
      throw error;
    }
  }

  if (!estimation) {
    let amount = 0n;
    // see if it is known legacy takes channel hook
    try {
      const commentFee = await readContract({
        abi: LEGACY_TAKES_CHANNEL_ABI,
        address: channelInfo.hook,
        functionName: "commentFee",
      });

      // sucessfully got the comment fee, so it is very likely to be a legacy takes channel hook
      amount =
        commentData.parentId === EMPTY_PARENT_ID &&
        commentData.commentType === COMMENT_TYPE_COMMENT
          ? commentFee
          : 0n;
    } catch (error) {
      if (!(error instanceof ContractFunctionExecutionError)) {
        throw error;
      }

      // exhuasted all options, assume 0 fee
      amount = 0n;
    }

    estimation = {
      amount,
      asset: NATIVE_ASSET_ADDRESS,
      description: "Legacy Takes Channel Hook",
      metadata: [],
      hook: channelInfo.hook,
    };
  }

  return estimation;
}

type GetEstimatedChannelEditCommentHookFeeParams = {
  channelId: bigint;
  commentData: CommentData;
  metadata: MetadataEntry[];
  msgSender: Hex;
  readContract: HookContractReadFunctions["estimateEditCommentFee"] &
    ContractReadFunctions["getChannel"] &
    LegacyTakesChannelContractReadFunctions["commentFee"];
  channelManagerAddress?: Hex;
};

/**
 * It calls the `estimateEditCommentFee` function on the hook to retrieve the estimated fee for editing a comment to a channel.
 * It also tries to probe if the hook is any known legacy hook and return corresponding fee estimation.
 * For estimation of total fee, use the `estimateChannelEditCommentFee` helper
 *
 * @param getEstimateChannelEditCommentHookFeeParams - The parameters for estimating the fee for editing a comment to a channel
 * @returns The estimated fee for editing a comment to a channel
 */
export async function getEstimatedChannelEditCommentHookFee({
  channelId,
  commentData,
  metadata,
  msgSender,
  readContract,
  channelManagerAddress,
}: GetEstimatedChannelEditCommentHookFeeParams): Promise<HookFeeEstimation> {
  const channelInfo = await getChannel({
    channelId,
    channelManagerAddress,
    readContract: readContract,
  });

  if (!channelInfo.hook) {
    return {
      amount: 0n,
      asset: NATIVE_ASSET_ADDRESS,
      description: "",
      metadata: [],
      hook: ZERO_ADDRESS,
    };
  }

  let estimation: HookFeeEstimation;
  try {
    estimation = {
      ...(await readContract({
        abi: BaseHookABI,
        address: channelInfo.hook,
        functionName: "estimateEditCommentFee",
        args: [commentData, metadata, msgSender],
      })),
      hook: channelInfo.hook,
    };
  } catch (error) {
    if (!(error instanceof ContractFunctionExecutionError)) {
      throw error;
    }

    // none of the known hooks requires fee for editing comment fee estimation
    estimation = {
      amount: 0n,
      asset: NATIVE_ASSET_ADDRESS,
      description: "Legacy Takes Channel Hook",
      metadata: [],
      hook: channelInfo.hook,
    };
  }

  return estimation;
}

type EstimateChannelCommentActionFeeParams<
  CommentActionFunc extends
    | typeof getEstimatedChannelPostCommentHookFee
    | typeof getEstimatedChannelEditCommentHookFee,
> = {
  readContract: ContractReadFunctions["getHookTransactionFee"] &
    ERC165ContractReadFunctions["supportsInterface"] &
    ERC20ContractReadFunctions["name"] &
    ERC20ContractReadFunctions["symbol"] &
    ERC20ContractReadFunctions["decimals"] &
    ERC20ContractReadFunctions["totalSupply"];
  commentActionFunc: CommentActionFunc;
} & (CommentActionFunc extends typeof getEstimatedChannelPostCommentHookFee
  ? GetEstimatedChannelPostCommentHookFeeParams
  : GetEstimatedChannelEditCommentHookFeeParams);

/**
 * Base function for best-effort estimation of the total fee for a comment action to a channel
 * @param param0
 * @returns
 */
async function estimateChannelCommentActionFee<
  CommentActionFunc extends
    | typeof getEstimatedChannelPostCommentHookFee
    | typeof getEstimatedChannelEditCommentHookFee,
>({
  readContract,
  commentActionFunc,
  channelManagerAddress,
  ...restOpts
}: EstimateChannelCommentActionFeeParams<CommentActionFunc>): Promise<TotalFeeEstimation> {
  let hookEstimatedFee: HookFeeEstimation;

  try {
    hookEstimatedFee = await commentActionFunc({
      ...restOpts,
      channelManagerAddress,
      readContract,
    });
  } catch (error) {
    if (!(error instanceof ContractFunctionExecutionError)) {
      throw error;
    }

    // if the hook estimation fails, that means the hook is old legacy hook
    // assume it does not need to be paid
    hookEstimatedFee = {
      amount: 0n,
      asset: NATIVE_ASSET_ADDRESS,
      description: "",
      metadata: [],
      hook: ZERO_ADDRESS,
    };
  }

  const { fee: transactionHookFee } = await getHookTransactionFee({
    channelManagerAddress,
    readContract,
  });

  if (transactionHookFee > 10000) {
    throw new Error("Transaction hook fee is greater than 100%");
  }

  const baseTokenAmount =
    hookEstimatedFee.asset === NATIVE_ASSET_ADDRESS
      ? hookEstimatedFee.amount
      : 0n;

  const totalFee =
    (baseTokenAmount * 10000n) / BigInt(10000 - transactionHookFee);

  const contractAsset: ContractBasedAssetType | undefined =
    hookEstimatedFee.asset === NATIVE_ASSET_ADDRESS
      ? undefined
      : {
          amount: hookEstimatedFee.amount,
          address: hookEstimatedFee.asset as Hex,
          type: await getERCType({
            contractAssetAddress: hookEstimatedFee.asset,
            readContract,
          }),
        };

  return {
    baseToken: {
      amount: totalFee,
    },
    contractAsset,
    description: hookEstimatedFee.description,
    metadata: hookEstimatedFee.metadata,
    hook: hookEstimatedFee.hook,
  };
}

/**
 * Best-effort estimation of the total fee for posting a comment to a channel
 *
 * @param estimatedChannelPostCommentHookFeeParams - The parameters for estimating the fee for posting a comment to a channel
 * @returns The estimated fee for posting a comment to a channel
 */
export async function estimateChannelPostCommentFee({
  ...restOpts
}: Omit<
  EstimateChannelCommentActionFeeParams<
    typeof getEstimatedChannelPostCommentHookFee
  >,
  "commentActionFunc"
>): Promise<TotalFeeEstimation> {
  return await estimateChannelCommentActionFee({
    ...restOpts,
    commentActionFunc: getEstimatedChannelPostCommentHookFee,
  });
}

/**
 * Best-effort estimation of the total fee for editing a comment to a channel
 *
 * @param estimatedChannelEditCommentHookFeeParams - The parameters for estimating the fee for editing a comment to a channel
 * @returns The estimated fee for editing a comment to a channel
 */
export async function estimateChannelEditCommentFee({
  ...restOpts
}: Omit<
  EstimateChannelCommentActionFeeParams<
    typeof getEstimatedChannelEditCommentHookFee
  >,
  "commentActionFunc"
>): Promise<TotalFeeEstimation> {
  return await estimateChannelCommentActionFee({
    ...restOpts,
    commentActionFunc: getEstimatedChannelEditCommentHookFee,
  });
}

/*
 * Helper function to create the data structure for estimating fee for comment post or edit
 */
export function createEstimateChannelPostOrEditCommentFeeData({
  createdAt = getOneMinuteFromNowInSeconds(),
  updatedAt = getOneMinuteFromNowInSeconds(),
  channelId = DEFAULT_CHANNEL_ID,
  commentType = DEFAULT_COMMENT_TYPE,
  authMethod = AuthorAuthMethod.DIRECT_TX,
  ...params
}: PartialBy<
  Omit<CommentData, "parentId" | "targetUri">,
  "createdAt" | "updatedAt" | "channelId" | "commentType" | "authMethod"
> &
  ({ targetUri: string } | { parentId: Hex })): CommentData {
  const parentIdOrTargetUri =
    "targetUri" in params
      ? {
          targetUri: params.targetUri,
          parentId: EMPTY_PARENT_ID,
        }
      : {
          targetUri: "",
          parentId: params.parentId,
        };

  return {
    ...params,
    ...parentIdOrTargetUri,
    commentType,
    channelId,
    createdAt,
    updatedAt,
    authMethod,
  };
}
