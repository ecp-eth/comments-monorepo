import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useWriteContract } from "wagmi";
import {
  createChannel,
  type CreateChannelResult,
  type CreateChannelParams,
  updateChannel,
  UpdateChannelResult,
  UpdateChannelParams,
} from "./contract.js";

type UseCreateChannelParams = Omit<CreateChannelParams, "writeContract">;

type UseCreateChannelOptions = UseMutationOptions<
  CreateChannelResult,
  Error,
  UseCreateChannelParams
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

type UseUpdateChannelOptions = UseMutationOptions<
  UpdateChannelResult,
  Error,
  UseUpdateChannelParams
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
