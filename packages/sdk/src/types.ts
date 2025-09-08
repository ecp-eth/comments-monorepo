import type { ReadContractParameters, ReadContractReturnType } from "viem";
import { ERC165_ABI, ERC20_ABI } from "./ercs.js";

type ERC20Type = typeof ERC20_ABI;
type ERC165Type = typeof ERC165_ABI;

export type ERC165ContractReadFunctions = {
  supportsInterface: (
    args: ReadContractParameters<ERC165Type, "supportsInterface">,
  ) => Promise<ReadContractReturnType<ERC165Type, "supportsInterface">>;
};

export type ERC20ContractReadFunctions = {
  name: (
    args: ReadContractParameters<ERC20Type, "name">,
  ) => Promise<ReadContractReturnType<ERC20Type, "name">>;
  symbol: (
    args: ReadContractParameters<ERC20Type, "symbol">,
  ) => Promise<ReadContractReturnType<ERC20Type, "symbol">>;
  decimals: (
    args: ReadContractParameters<ERC20Type, "decimals">,
  ) => Promise<ReadContractReturnType<ERC20Type, "decimals">>;
  totalSupply: (
    args: ReadContractParameters<ERC20Type, "totalSupply">,
  ) => Promise<ReadContractReturnType<ERC20Type, "totalSupply">>;
};
