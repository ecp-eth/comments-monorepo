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
