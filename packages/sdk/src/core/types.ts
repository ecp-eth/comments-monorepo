import type {
  Abi,
  ContractEventName,
  GetContractEventsReturnType,
  PublicActions,
} from "viem";
import type { Hex } from "./schemas";

/**
 * The result of a write contract function
 */

export type WriteContractHelperResult = {
  /**
   * The transaction hash
   */
  txHash: Hex;
}; /**
 * The result of a write contract function that returns a value
 */

export type WaitableWriteContractHelperResult<
  TAbi extends Abi,
  TEventName extends ContractEventName<TAbi>,
> = WriteContractHelperResult & {
  /**
   * Wait for the return value of the method call
   */
  wait: (params: {
    getContractEvents: PublicActions["getContractEvents"];
    waitForTransactionReceipt: PublicActions["waitForTransactionReceipt"];
  }) => Promise<
    GetContractEventsReturnType<TAbi, TEventName>[number]["args"] | undefined
  >;
};
