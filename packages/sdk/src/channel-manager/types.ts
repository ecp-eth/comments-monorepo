import type {
  AbiStateMutability,
  ContractFunctionName,
  ContractFunctionParameters,
} from "viem";
import type { Hex } from "../types.js";
import { ChannelManagerAbi } from "../abis.js";

export type ChannelManagerAbiType = typeof ChannelManagerAbi;

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
