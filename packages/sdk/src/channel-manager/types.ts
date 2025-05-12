import type {
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import type { Hex } from "../core/schemas.js";
import type { ChannelManagerABI } from "../abis.js";

export type ChannelManagerABIType = typeof ChannelManagerABI;

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
    }
  ) => Promise<Hex>;

  setBaseURI: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setBaseURI"
    >
  ) => Promise<Hex>;

  setChannelCreationFee: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setChannelCreationFee"
    >
  ) => Promise<Hex>;

  setHook: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setHook"
    >
  ) => Promise<Hex>;

  setHookTransactionFee: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "setHookTransactionFee"
    >
  ) => Promise<Hex>;

  updateChannel: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "updateChannel"
    >
  ) => Promise<Hex>;

  updateCommentsContract: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "updateCommentsContract"
    >
  ) => Promise<Hex>;

  withdrawFees: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "nonpayable",
      "withdrawFees"
    >
  ) => Promise<Hex>;

  executeHook: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "payable",
      "executeHook"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;

  collectChannelCreationFee: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "payable",
      "collectChannelCreationFee"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;

  calculateHookTransactionFee: (
    args: ContractFunctionParameters<
      ChannelManagerABIType,
      "view",
      "calculateHookTransactionFee"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;
};

export type ContractReadFunctions = {
  getChannel: (
    args: ReadContractParameters<ChannelManagerABIType, "getChannel">
  ) => Promise<ReadContractReturnType<ChannelManagerABIType, "getChannel">>;

  channelExists: (
    args: ReadContractParameters<ChannelManagerABIType, "channelExists">
  ) => Promise<ReadContractReturnType<ChannelManagerABIType, "channelExists">>;

  getChannelOwner: (
    args: ReadContractParameters<ChannelManagerABIType, "getChannelOwner">
  ) => Promise<
    ReadContractReturnType<ChannelManagerABIType, "getChannelOwner">
  >;

  getChannelCreationFee: (
    args: ReadContractParameters<ChannelManagerABIType, "getChannelCreationFee">
  ) => Promise<
    ReadContractReturnType<ChannelManagerABIType, "getChannelCreationFee">
  >;

  getHookTransactionFee: (
    args: ReadContractParameters<ChannelManagerABIType, "getHookTransactionFee">
  ) => Promise<
    ReadContractReturnType<ChannelManagerABIType, "getHookTransactionFee">
  >;
};
