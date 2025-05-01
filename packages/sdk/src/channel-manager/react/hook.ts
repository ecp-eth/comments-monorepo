import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { usePublicClient, useWriteContract } from "wagmi";
import {
  type SetHookParams,
  type SetHookResult,
  setHook,
  type GetHookTransactionFeeParams,
  type GetHookTransactionFeeResult,
  getHookTransactionFee,
  type SetHookTransactionFeeParams,
  type SetHookTransactionFeeResult,
  setHookTransactionFee,
} from "../hook.js";

export type UseSetHookParams = Omit<SetHookParams, "writeContract">;
export type UseSetHookOptions = Omit<
  UseMutationOptions<SetHookResult, Error, UseSetHookParams>,
  "mutationFn"
>;
export type UseSetHookResult = UseMutationResult<
  SetHookResult,
  Error,
  UseSetHookParams
>;

/**
 * Set the hook for a channel
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useSetHook(options: UseSetHookOptions = {}): UseSetHookResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return setHook({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseGetHookTransactionFeeParams = Omit<
  GetHookTransactionFeeParams,
  "readContract"
>;
export type UseGetHookTransactionFeeOptions = Omit<
  UseQueryOptions<GetHookTransactionFeeResult, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetHookTransactionFeeResult = UseQueryResult<
  GetHookTransactionFeeResult,
  Error
>;

/**
 * Get the hook transaction fee from channel manager
 *
 * @param params - The parameters for getting the hook transaction fee from channel manager
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetHookTransactionFee(
  params: UseGetHookTransactionFeeParams = {},
  options: UseGetHookTransactionFeeOptions = {}
): UseGetHookTransactionFeeResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["hookTransactionFee", params.channelManagerAddress],
    queryFn: async () => {
      const result = await getHookTransactionFee({
        ...params,
        readContract: async (params) => {
          if (!client) {
            throw new Error("Client not found");
          }

          return client.readContract(params);
        },
      });
      return result;
    },
  });
}

export type UseSetHookTransactionFeeParams = Omit<
  SetHookTransactionFeeParams,
  "writeContract"
>;
export type UseSetHookTransactionFeeOptions = Omit<
  UseMutationOptions<
    SetHookTransactionFeeResult,
    Error,
    UseSetHookTransactionFeeParams
  >,
  "mutationFn"
>;
export type UseSetHookTransactionFeeResult = UseMutationResult<
  SetHookTransactionFeeResult,
  Error,
  UseSetHookTransactionFeeParams
>;

/**
 * Set the percentage of the fee for the hook transaction
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useSetHookTransactionFee(
  options: UseSetHookTransactionFeeOptions = {}
): UseSetHookTransactionFeeResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return setHookTransactionFee({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}
