import type {
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import type { Hex } from "../core/schemas.js";
import type { ChannelManagerABI } from "../abis.js";
import type { MetadataEntry } from "../comments/types.js";

export type ChannelManagerABIType = typeof ChannelManagerABI;

export type ChannelPermissions = {
  onInitialize: boolean;
  onCommentAdd: boolean;
  onCommentDelete: boolean;
  onCommentEdit: boolean;
  onChannelUpdate: boolean;
};

export type Channel = {
  name: string;
  description: string | undefined;
  metadata: MetadataEntry[] | undefined;
  hook: Hex | undefined;
  permissions: ChannelPermissions;
};

// we can't use generics and mapped type because the API would be lazy resolved
// causing type errors in userland.
export type ContractWriteFunctions = {
  createChannel: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "payable",
      "createChannel"
    > & {
      value?: bigint;
    },
  ) => Promise<Hex>;

  setBaseURI: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setBaseURI"
    >,
  ) => Promise<Hex>;

  setChannelCreationFee: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setChannelCreationFee"
    >,
  ) => Promise<Hex>;

  setCommentCreationFee: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setCommentCreationFee"
    >,
  ) => Promise<Hex>;

  setHook: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setHook"
    >,
  ) => Promise<Hex>;

  setHookTransactionFee: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setHookTransactionFee"
    >,
  ) => Promise<Hex>;

  updateChannel: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "updateChannel"
    >,
  ) => Promise<Hex>;

  withdrawFees: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "withdrawFees"
    >,
  ) => Promise<Hex>;
};

export type ContractReadFunctions = {
  getChannel: (
    args: ReadContractParameters<ChannelManagerABIType, "getChannel">,
  ) => Promise<ReadContractReturnType<ChannelManagerABIType, "getChannel">>;

  getChannelMetadata: (
    args: ReadContractParameters<ChannelManagerABIType, "getChannelMetadata">,
  ) => Promise<
    ReadContractReturnType<ChannelManagerABIType, "getChannelMetadata">
  >;

  channelExists: (
    args: ReadContractParameters<ChannelManagerABIType, "channelExists">,
  ) => Promise<ReadContractReturnType<ChannelManagerABIType, "channelExists">>;

  ownerOf: (
    args: ReadContractParameters<ChannelManagerABIType, "ownerOf">,
  ) => Promise<ReadContractReturnType<ChannelManagerABIType, "ownerOf">>;

  getChannelCreationFee: (
    args: ReadContractParameters<
      ChannelManagerABIType,
      "getChannelCreationFee"
    >,
  ) => Promise<
    ReadContractReturnType<ChannelManagerABIType, "getChannelCreationFee">
  >;

  getCommentCreationFee: (
    args: ReadContractParameters<
      ChannelManagerABIType,
      "getCommentCreationFee"
    >,
  ) => Promise<
    ReadContractReturnType<ChannelManagerABIType, "getCommentCreationFee">
  >;

  getHookTransactionFee: (
    args: ReadContractParameters<
      ChannelManagerABIType,
      "getHookTransactionFee"
    >,
  ) => Promise<
    ReadContractReturnType<ChannelManagerABIType, "getHookTransactionFee">
  >;

  deductProtocolHookTransactionFee: (
    args: ReadContractParameters<
      ChannelManagerABIType,
      "deductProtocolHookTransactionFee"
    >,
  ) => Promise<
    ReadContractReturnType<
      ChannelManagerABIType,
      "deductProtocolHookTransactionFee"
    >
  >;
};

/**
 * FeeEstimation struct returned from fee estimator functions
 */
export type FeeEstimation = {
  amount: bigint;
  asset: Hex;
  description: string;
  metadata: readonly MetadataEntry[];
};
