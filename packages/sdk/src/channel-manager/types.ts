import type {
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import type { Hex } from "../types.js";
import type { ChannelManagerAbi } from "../abis.js";

export type ChannelManagerAbiType = typeof ChannelManagerAbi;

// we can't use generics and mapped type because the API would be lazy resolved
// causing type errors in userland.
export type ContractWriteFunctions = {
  createChannel: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "payable",
      "createChannel"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;
  registerHook: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "payable",
      "registerHook"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;

  setBaseURI: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "setBaseURI"
    >
  ) => Promise<Hex>;

  setChannelCreationFee: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "setChannelCreationFee"
    >
  ) => Promise<Hex>;

  setHook: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "setHook"
    >
  ) => Promise<Hex>;

  setHookGloballyEnabled: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "setHookGloballyEnabled"
    >
  ) => Promise<Hex>;

  setHookRegistrationFee: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "setHookRegistrationFee"
    >
  ) => Promise<Hex>;

  setHookTransactionFee: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "setHookTransactionFee"
    >
  ) => Promise<Hex>;

  updateChannel: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "updateChannel"
    >
  ) => Promise<Hex>;

  updateCommentsContract: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "updateCommentsContract"
    >
  ) => Promise<Hex>;

  withdrawFees: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "nonpayable",
      "withdrawFees"
    >
  ) => Promise<Hex>;

  executeHooks: (
    args: ContractFunctionParameters<
      ChannelManagerAbiType,
      "payable",
      "executeHooks"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;
};

export type ContractReadFunctions = {
  getChannel: (
    args: ReadContractParameters<ChannelManagerAbiType, "getChannel">
  ) => Promise<ReadContractReturnType<ChannelManagerAbiType, "getChannel">>;

  channelExists: (
    args: ReadContractParameters<ChannelManagerAbiType, "channelExists">
  ) => Promise<ReadContractReturnType<ChannelManagerAbiType, "channelExists">>;

  getChannelOwner: (
    args: ReadContractParameters<ChannelManagerAbiType, "getChannelOwner">
  ) => Promise<
    ReadContractReturnType<ChannelManagerAbiType, "getChannelOwner">
  >;

  getChannelCreationFee: (
    args: ReadContractParameters<ChannelManagerAbiType, "getChannelCreationFee">
  ) => Promise<
    ReadContractReturnType<ChannelManagerAbiType, "getChannelCreationFee">
  >;

  getHookStatus: (
    args: ReadContractParameters<ChannelManagerAbiType, "getHookStatus">
  ) => Promise<ReadContractReturnType<ChannelManagerAbiType, "getHookStatus">>;

  getHookRegistrationFee: (
    args: ReadContractParameters<
      ChannelManagerAbiType,
      "getHookRegistrationFee"
    >
  ) => Promise<
    ReadContractReturnType<ChannelManagerAbiType, "getHookRegistrationFee">
  >;

  getHookTransactionFee: (
    args: ReadContractParameters<ChannelManagerAbiType, "getHookTransactionFee">
  ) => Promise<
    ReadContractReturnType<ChannelManagerAbiType, "getHookTransactionFee">
  >;
};
