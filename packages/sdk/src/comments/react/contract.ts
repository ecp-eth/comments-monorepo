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
  type UpdateChannelContractParams,
  type UpdateChannelContractResult,
  updateChannelContract,
  type GetContractNameParams,
  getContractName,
  type GetContractVersionParams,
  getContractVersion,
  type GetDomainSeparatorParams,
  getDomainSeparator,
  type GetChannelManagerParams,
  getChannelManager,
} from "../contract.js";

export type UseUpdateChannelContractParams = Omit<
  UpdateChannelContractParams,
  "writeContract"
>;
export type UseUpdateChannelContractOptions = Omit<
  UseMutationOptions<
    UpdateChannelContractResult,
    Error,
    UseUpdateChannelContractParams
  >,
  "mutationFn"
>;
export type UseUpdateChannelContractResult = UseMutationResult<
  UpdateChannelContractResult,
  Error,
  UseUpdateChannelContractParams
>;

/**
 * React hook to update the channel manager contract address (only owner)
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useUpdateChannelContract(
  options: UseUpdateChannelContractOptions = {}
): UseUpdateChannelContractResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return updateChannelContract({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseGetContractNameParams = Omit<
  GetContractNameParams,
  "readContract"
>;
export type UseGetContractNameOptions = Omit<
  UseQueryOptions<string, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetContractNameResult = UseQueryResult<string, Error>;

/**
 * React hook to get the contract name
 *
 * @param params - The parameters for getting the contract name
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetContractName(
  params: UseGetContractNameParams = {},
  options: UseGetContractNameOptions = {}
): UseGetContractNameResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["contractName", params.commentsContractAddress],
    queryFn: async () => {
      const result = await getContractName({
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

export type UseGetContractVersionParams = Omit<
  GetContractVersionParams,
  "readContract"
>;
export type UseGetContractVersionOptions = Omit<
  UseQueryOptions<string, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetContractVersionResult = UseQueryResult<string, Error>;

/**
 * React hook to get the contract version
 *
 * @param params - The parameters for getting the contract version
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetContractVersion(
  params: UseGetContractVersionParams = {},
  options: UseGetContractVersionOptions = {}
): UseGetContractVersionResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["contractVersion", params.commentsContractAddress],
    queryFn: async () => {
      const result = await getContractVersion({
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

export type UseGetDomainSeparatorParams = Omit<
  GetDomainSeparatorParams,
  "readContract"
>;
export type UseGetDomainSeparatorOptions = Omit<
  UseQueryOptions<string, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetDomainSeparatorResult = UseQueryResult<string, Error>;

/**
 * React hook to get the EIP-712 domain separator
 *
 * @param params - The parameters for getting the domain separator
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetDomainSeparator(
  params: UseGetDomainSeparatorParams = {},
  options: UseGetDomainSeparatorOptions = {}
): UseGetDomainSeparatorResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["domainSeparator", params.commentsContractAddress],
    queryFn: async () => {
      const result = await getDomainSeparator({
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

export type UseGetChannelManagerParams = Omit<
  GetChannelManagerParams,
  "readContract"
>;
export type UseGetChannelManagerOptions = Omit<
  UseQueryOptions<string, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetChannelManagerResult = UseQueryResult<string, Error>;

/**
 * React hook to get the channel manager contract address
 *
 * @param params - The parameters for getting the channel manager
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetChannelManager(
  params: UseGetChannelManagerParams = {},
  options: UseGetChannelManagerOptions = {}
): UseGetChannelManagerResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["channelManager", params.commentsContractAddress],
    queryFn: async () => {
      const result = await getChannelManager({
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
