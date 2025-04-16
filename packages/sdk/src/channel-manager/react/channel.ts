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
  createChannel,
  type CreateChannelResult,
  type CreateChannelParams,
  updateChannel,
  type UpdateChannelResult,
  type UpdateChannelParams,
  type GetChannelParams,
  type GetChannelResult,
  getChannel,
  type GetChannelOwnerParams,
  type GetChannelOwnerResult,
  getChannelOwner,
  type GetChannelCreationFeeParams,
  type GetChannelCreationFeeResult,
  getChannelCreationFee,
  type SetChannelCreationFeeParams,
  type SetChannelCreationFeeResult,
  setChannelCreationFee,
  type WithdrawFeesParams,
  type WithdrawFeesResult,
  withdrawFees,
  type UpdateCommentsContractParams,
  type UpdateCommentsContractResult,
  updateCommentsContract,
  type SetBaseURIParams,
  type SetBaseURIResult,
  setBaseURI,
  type ChannelExistsParams,
  channelExists,
} from "../channel.js";

type UseCreateChannelParams = Omit<CreateChannelParams, "writeContract">;
type UseCreateChannelOptions = Omit<
  UseMutationOptions<CreateChannelResult, Error, UseCreateChannelParams>,
  "mutationFn"
>;
type UseCreateChannelResult = UseMutationResult<
  CreateChannelResult,
  Error,
  UseCreateChannelParams
>;

/**
 * Create a new channel
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useCreateChannel(
  options: UseCreateChannelOptions = {}
): UseCreateChannelResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return createChannel({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

type UseUpdateChannelParams = Omit<UpdateChannelParams, "writeContract">;
type UseUpdateChannelOptions = Omit<
  UseMutationOptions<UpdateChannelResult, Error, UseUpdateChannelParams>,
  "mutationFn"
>;
type UseUpdateChannelResult = UseMutationResult<
  UpdateChannelResult,
  Error,
  UseUpdateChannelParams
>;

/**
 * Update a channel
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useUpdateChannel(
  options: UseUpdateChannelOptions = {}
): UseUpdateChannelResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return updateChannel({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

type UseGetChannelParams = Omit<GetChannelParams, "readContract">;
type UseGetChannelOptions = Omit<
  UseQueryOptions<GetChannelResult, Error>,
  "queryKey" | "queryFn"
>;
type UseGetChannelResult = UseQueryResult<GetChannelResult, Error>;

/**
 * Get a channel
 *
 * @param params - The parameters for getting a channel
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetChannel(
  params: UseGetChannelParams,
  options: UseGetChannelOptions = {}
): UseGetChannelResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["channel", params.channelId, params.channelManagerAddress],
    queryFn: async () => {
      const result = await getChannel({
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

type UseChannelExistsParams = Omit<ChannelExistsParams, "readContract">;
type UseChannelExistsOptions = Omit<
  UseQueryOptions<boolean, Error>,
  "queryKey" | "queryFn"
>;
type UseChannelExistsResult = UseQueryResult<boolean, Error>;

/**
 * Check if a channel exists
 *
 * @param params - The parameters for checking if a channel exists
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useChannelExists(
  params: UseChannelExistsParams,
  options: UseChannelExistsOptions = {}
): UseChannelExistsResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["channelExists", params.channelId, params.channelManagerAddress],
    queryFn: async () => {
      const result = await channelExists({
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

type UseGetChannelOwnerParams = Omit<GetChannelOwnerParams, "readContract">;
type UseGetChannelOwnerOptions = Omit<
  UseQueryOptions<GetChannelOwnerResult, Error>,
  "queryKey" | "queryFn"
>;
type UseGetChannelOwnerResult = UseQueryResult<GetChannelOwnerResult, Error>;

/**
 * Get the owner of a channel
 *
 * @param params - The parameters for getting the owner of a channel
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetChannelOwner(
  params: UseGetChannelOwnerParams,
  options: UseGetChannelOwnerOptions = {}
): UseGetChannelOwnerResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["channelOwner", params.channelId, params.channelManagerAddress],
    queryFn: async () => {
      const result = await getChannelOwner({
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

type UseGetChannelCreationFeeParams = Omit<
  GetChannelCreationFeeParams,
  "readContract"
>;
type UseGetChannelCreationFeeOptions = Omit<
  UseQueryOptions<GetChannelCreationFeeResult, Error>,
  "queryKey" | "queryFn"
>;
type UseGetChannelCreationFeeResult = UseQueryResult<
  GetChannelCreationFeeResult,
  Error
>;

/**
 * Get the creation fee from channel manager
 *
 * @param params - The parameters for getting the creation fee from channel manager
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetChannelCreationFee(
  params: UseGetChannelCreationFeeParams = {},
  options: UseGetChannelCreationFeeOptions = {}
): UseGetChannelCreationFeeResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["channelCreationFee", params.channelManagerAddress],
    queryFn: async () => {
      const result = await getChannelCreationFee({
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

type UseSetChannelCreationFeeParams = Omit<
  SetChannelCreationFeeParams,
  "writeContract"
>;
type UseSetChannelCreationFeeOptions = Omit<
  UseMutationOptions<
    SetChannelCreationFeeResult,
    Error,
    UseSetChannelCreationFeeParams
  >,
  "mutationFn"
>;
type UseSetChannelCreationFeeResult = UseMutationResult<
  SetChannelCreationFeeResult,
  Error,
  UseSetChannelCreationFeeParams
>;

/**
 * Set the fee for creating a new channel
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useSetChannelCreationFee(
  options: UseSetChannelCreationFeeOptions = {}
): UseSetChannelCreationFeeResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return setChannelCreationFee({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

type UseWithdrawFeesParams = Omit<WithdrawFeesParams, "writeContract">;
type UseWithdrawFeesOptions = Omit<
  UseMutationOptions<WithdrawFeesResult, Error, UseWithdrawFeesParams>,
  "mutationFn"
>;
type UseWithdrawFeesResult = UseMutationResult<
  WithdrawFeesResult,
  Error,
  UseWithdrawFeesParams
>;

/**
 * Withdraws accumulated fees to a specified address
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useWithdrawFees(
  options: UseWithdrawFeesOptions = {}
): UseWithdrawFeesResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return withdrawFees({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

type UseUpdateCommentsContractParams = Omit<
  UpdateCommentsContractParams,
  "writeContract"
>;
type UseUpdateCommentsContractOptions = Omit<
  UseMutationOptions<
    UpdateCommentsContractResult,
    Error,
    UseUpdateCommentsContractParams
  >,
  "mutationFn"
>;
type UseUpdateCommentsContractResult = UseMutationResult<
  UpdateCommentsContractResult,
  Error,
  UseUpdateCommentsContractParams
>;

/**
 * Updates the comments contract address
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useUpdateCommentsContract(
  options: UseUpdateCommentsContractOptions = {}
): UseUpdateCommentsContractResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return updateCommentsContract({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

type UseSetBaseURIParams = Omit<SetBaseURIParams, "writeContract">;
type UseSetBaseURIOptions = Omit<
  UseMutationOptions<SetBaseURIResult, Error, UseSetBaseURIParams>,
  "mutationFn"
>;
type UseSetBaseURIResult = UseMutationResult<
  SetBaseURIResult,
  Error,
  UseSetBaseURIParams
>;

/**
 * Sets the base URI for NFT metadata
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useSetBaseURI(
  options: UseSetBaseURIOptions = {}
): UseSetBaseURIResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return setBaseURI({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}
