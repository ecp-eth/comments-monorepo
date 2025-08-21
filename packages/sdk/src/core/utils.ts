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

export type RunAsyncOptions = {
  /**
   * The signal to abort the function.
   */
  signal?: AbortSignal;
  /**
   * The number of times to retry the function in case of failure.
   *
   * If omitted, the function won't be retried.
   */
  retries?: number;
  /**
   * The backoff strategy to use.
   *
   * @default { type: "none" }
   */
  backoff?:
    | { type: "exponential"; delay: number }
    | { type: "constant"; delay: number }
    | { type: "none" };
  /**
   * A function to determine if the function should be retried.
   *
   * By default, the function will always retry until the number of retries is reached.
   * If the number of retries is not set then this function will be ignored.
   *
   * @param error The error that occurred.
   * @returns True if the function should be retried, false otherwise.
   */
  retryCondition?: (error: unknown) => boolean;
};

/**
 * Run an async function with retries and backoff.
 *
 * @param func - The async function to run. The function receives the signal as a parameter.
 * @param options - The options for the function.
 * @returns The result of the function.
 */
export function runAsync<T>(
  func: (signal?: AbortSignal) => Promise<T>,
  options: RunAsyncOptions,
): Promise<T> {
  const { signal, retries, backoff, retryCondition: shouldRetry } = options;

  const execute = async (attempt = 0): Promise<T> => {
    try {
      // Check if aborted before executing
      if (signal?.aborted) {
        throw signal.reason;
      }

      return await func(signal);
    } catch (error) {
      // If no more retries, throw the error
      if (attempt >= (retries ?? 0)) {
        throw error;
      }

      // If the function should not be retried, throw the error
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // If aborted, throw the abort reason
      if (signal?.aborted) {
        throw signal.reason;
      }

      if (backoff && backoff.type !== "none") {
        const delay =
          backoff.type === "exponential"
            ? Math.min(backoff.delay * Math.pow(2, attempt), 10000)
            : backoff.delay;

        // Create a promise that resolves after delay or rejects if aborted
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, delay);

          if (signal) {
            signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(signal.reason);
            });
          }
        });
      }

      return execute(attempt + 1);
    }
  };

  return execute();
}
