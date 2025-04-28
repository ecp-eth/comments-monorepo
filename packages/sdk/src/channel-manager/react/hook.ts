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
  type GetHookStatusParams,
  type GetHookStatusResult,
  getHookStatus,
  type SetHookParams,
  type SetHookResult,
  setHook,
  type RegisterHookParams,
  type RegisterHookResult,
  registerHook,
  type SetHookGloballyEnabledParams,
  type SetHookGloballyEnabledResult,
  setHookGloballyEnabled,
  type GetHookRegistrationFeeParams,
  type GetHookRegistrationFeeResult,
  getHookRegistrationFee,
  type SetHookRegistrationFeeParams,
  type SetHookRegistrationFeeResult,
  setHookRegistrationFee,
  type GetHookTransactionFeeParams,
  type GetHookTransactionFeeResult,
  getHookTransactionFee,
  type SetHookTransactionFeeParams,
  type SetHookTransactionFeeResult,
  setHookTransactionFee,
} from "../hook.js";

export type UseGetHookStatusParams = Omit<GetHookStatusParams, "readContract">;
export type UseGetHookStatusOptions = Omit<
  UseQueryOptions<GetHookStatusResult, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetHookStatusResult = UseQueryResult<GetHookStatusResult, Error>;

/**
 * Get the status of a hook
 *
 * @param params - The parameters for getting the status of a hook
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetHookStatus(
  params: UseGetHookStatusParams,
  options: UseGetHookStatusOptions = {}
): UseGetHookStatusResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["hookStatus", params.hookAddress, params.channelManagerAddress],
    queryFn: async () => {
      const result = await getHookStatus({
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

export type UseRegisterHookParams = Omit<RegisterHookParams, "writeContract">;
export type UseRegisterHookOptions = Omit<
  UseMutationOptions<RegisterHookResult, Error, UseRegisterHookParams>,
  "mutationFn"
>;
export type UseRegisterHookResult = UseMutationResult<
  RegisterHookResult,
  Error,
  UseRegisterHookParams
>;

/**
 * Register a hook into a global registry
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useRegisterHook(
  options: UseRegisterHookOptions = {}
): UseRegisterHookResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return registerHook({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseSetHookGloballyEnabledParams = Omit<
  SetHookGloballyEnabledParams,
  "writeContract"
>;
export type UseSetHookGloballyEnabledOptions = UseMutationOptions<
  SetHookGloballyEnabledResult,
  Error,
  UseSetHookGloballyEnabledParams
>;
export type UseSetHookGloballyEnabledResult = UseMutationResult<
  SetHookGloballyEnabledResult,
  Error,
  UseSetHookGloballyEnabledParams
>;

/**
 * Register a hook into a global registry
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useSetHookGloballyEnabled(
  options: UseSetHookGloballyEnabledOptions = {}
): UseSetHookGloballyEnabledResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return setHookGloballyEnabled({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseGetHookRegistrationFeeParams = Omit<
  GetHookRegistrationFeeParams,
  "readContract"
>;
export type UseGetHookRegistrationFeeOptions = Omit<
  UseQueryOptions<GetHookRegistrationFeeResult, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetHookRegistrationFeeResult = UseQueryResult<
  GetHookRegistrationFeeResult,
  Error
>;

/**
 * Get the fee for registering a new hook
 *
 * @param params - The parameters for getting the fee for registering a new hook
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetHookRegistrationFee(
  params: UseGetHookRegistrationFeeParams = {},
  options: UseGetHookRegistrationFeeOptions = {}
): UseGetHookRegistrationFeeResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["hookRegistrationFee", params.channelManagerAddress],
    queryFn: async () => {
      const result = await getHookRegistrationFee({
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

export type UseSetHookRegistrationFeeParams = Omit<
  SetHookRegistrationFeeParams,
  "writeContract"
>;
export type UseSetHookRegistrationFeeOptions = UseMutationOptions<
  SetHookRegistrationFeeResult,
  Error,
  UseSetHookRegistrationFeeParams
>;
export type UseSetHookRegistrationFeeResult = UseMutationResult<
  SetHookRegistrationFeeResult,
  Error,
  UseSetHookRegistrationFeeParams
>;

/**
 * Set the fee for registering a new hook
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useSetHookRegistrationFee(
  options: UseSetHookRegistrationFeeOptions = {}
): UseSetHookRegistrationFeeResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return setHookRegistrationFee({
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
