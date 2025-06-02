import type { Abi } from "viem";
import type {
  ContractEventName,
  GetContractEventsReturnType,
  PublicActions,
} from "viem";
import type { Hex } from "./schemas.js";
import type {
  WriteContractHelperResult,
  WaitableWriteContractHelperResult,
} from "./types.js";

/**
 * Check if a hex string is zero
 * @param hex The hex string to check
 * @returns True if the hex string is zero, false otherwise
 */
export function isZeroHex(hex: Hex) {
  return hex.replace(/0/g, "") === "x";
}

/**
 * Wait for the transaction receipt and return the event arguments specifically produced by the transaction.
 *
 * @param params The parameters for the contract write
 * @returns The result of the contract write
 */
async function waitContractWriteEventArgs<
  TAbi extends Abi,
  TEventName extends ContractEventName<TAbi>,
>({
  txHash,
  abi,
  eventName,
  getContractEvents,
  waitForTransactionReceipt,
}: {
  txHash: Hex;
  abi: TAbi;
  eventName: TEventName;
  getContractEvents: PublicActions["getContractEvents"];
  waitForTransactionReceipt: PublicActions["waitForTransactionReceipt"];
}): Promise<
  GetContractEventsReturnType<TAbi, TEventName>[number]["args"] | undefined
> {
  const receipt = await waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status === "reverted") {
    return;
  }

  const events = await getContractEvents({
    address:
      typeof receipt.contractAddress === "string"
        ? receipt.contractAddress
        : undefined,
    abi,
    eventName,
    // Search for the event in the block where the transaction was mined
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  for (const event of events) {
    if (event.transactionHash !== txHash) {
      continue;
    }

    return event.args;
  }
}

/**
 * This function wraps the write function to add a `wait()` method in the returned object.
 * The `wait()` method waits the transaction receipt and
 * returns the event arguments specified by the write function, within the transaction.
 *
 * This is due to EVM limitations, the return value of a contract write cannot be returned directly.
 * We had to use the events to expose certain useful values related to the write.
 *
 * @param param0
 * @returns
 */
export function createWaitableWriteContractHelper<
  TArgs extends unknown[],
  TAbi extends Abi,
  TEventName extends ContractEventName<TAbi>,
  TWriteContractHelperResult extends WriteContractHelperResult,
>(
  writeFunc: (...args: TArgs) => Promise<TWriteContractHelperResult>,
  {
    abi,
    eventName,
  }: {
    abi: TAbi;
    eventName: TEventName;
  },
) {
  return async (
    ...args: TArgs
  ): Promise<WaitableWriteContractHelperResult<TAbi, TEventName>> => {
    const writeHelperResult = await writeFunc(...args);
    const { txHash } = writeHelperResult;
    return {
      ...writeHelperResult,
      wait: async ({
        getContractEvents,
        waitForTransactionReceipt,
      }: {
        getContractEvents: PublicActions["getContractEvents"];
        waitForTransactionReceipt: PublicActions["waitForTransactionReceipt"];
      }) => {
        return await waitContractWriteEventArgs({
          txHash,
          abi,
          eventName,
          getContractEvents,
          waitForTransactionReceipt,
        });
      },
    };
  };
}
