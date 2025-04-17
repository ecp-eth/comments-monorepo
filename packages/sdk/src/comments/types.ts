import type {
  ContractFunctionName,
  ContractFunctionParameters,
  ReadContractReturnType,
} from "viem";
import type { Hex } from "../types.js";
import type { CommentsV1Abi } from "../abis.js";

export type CommentsV1AbiType = typeof CommentsV1Abi;

type PayableContractWriteFunctionNames = ContractFunctionName<
  CommentsV1AbiType,
  "payable"
>;
type NonPayableContractWriteFunctionNames = ContractFunctionName<
  CommentsV1AbiType,
  "nonpayable"
>;

export type ContractWriteFunctions = {
  [K in PayableContractWriteFunctionNames]: (
    args: ContractFunctionParameters<CommentsV1AbiType, "payable", K>
  ) => Promise<Hex>;
} & {
  [K in NonPayableContractWriteFunctionNames]: (
    args: ContractFunctionParameters<CommentsV1AbiType, "nonpayable", K>
  ) => Promise<Hex>;
};

export type ContractReadFunctions = {
  [K in ContractFunctionName<CommentsV1AbiType, "view">]: (
    args: ContractFunctionParameters<CommentsV1AbiType, "view", K>
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, K>>;
};
