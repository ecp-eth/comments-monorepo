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
  type IsApprovedParams,
  isApproved,
  type AddApprovalParams,
  type AddApprovalResult,
  addApproval,
  type AddApprovalWithSigParams,
  type AddApprovalWithSigResult,
  addApprovalWithSig,
  type RevokeApprovalParams,
  type RevokeApprovalResult,
  revokeApproval,
  type RevokeApprovalWithSigParams,
  type RevokeApprovalWithSigResult,
  revokeApprovalWithSig,
} from "../approval.js";

export type UseIsApprovedParams = Omit<IsApprovedParams, "readContract">;
export type UseIsApprovedOptions = Omit<
  UseQueryOptions<boolean, Error>,
  "queryKey" | "queryFn"
>;
export type UseIsApprovedResult = UseQueryResult<boolean, Error>;

/**
 * React hook to check if an app signer is approved for an author
 *
 * @param params - The parameters for checking approval
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useIsApproved(
  params: UseIsApprovedParams,
  options: UseIsApprovedOptions = {},
): UseIsApprovedResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["isApproved", params.author, params.app, params.commentsAddress],
    queryFn: async () => {
      const result = await isApproved({
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

export type UseAddApprovalParams = Omit<AddApprovalParams, "writeContract">;
export type UseAddApprovalOptions = Omit<
  UseMutationOptions<AddApprovalResult, Error, UseAddApprovalParams>,
  "mutationFn"
>;
export type UseAddApprovalResult = UseMutationResult<
  AddApprovalResult,
  Error,
  UseAddApprovalParams
>;

/**
 * React hook to approve an app signer directly as author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useAddApproval(
  options: UseAddApprovalOptions = {},
): UseAddApprovalResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return addApproval({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseAddApprovalWithSigParams = Omit<
  AddApprovalWithSigParams,
  "writeContract"
>;
export type UseAddApprovalWithSigOptions = Omit<
  UseMutationOptions<
    AddApprovalWithSigResult,
    Error,
    UseAddApprovalWithSigParams
  >,
  "mutationFn"
>;
export type UseAddApprovalWithSigResult = UseMutationResult<
  AddApprovalWithSigResult,
  Error,
  UseAddApprovalWithSigParams
>;

/**
 * React hook to add an app signer approval with signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useAddApprovalWithSig(
  options: UseAddApprovalWithSigOptions = {},
): UseAddApprovalWithSigResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return addApprovalWithSig({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseRevokeApprovalParams = Omit<
  RevokeApprovalParams,
  "writeContract"
>;
export type UseRevokeApprovalOptions = Omit<
  UseMutationOptions<RevokeApprovalResult, Error, UseRevokeApprovalParams>,
  "mutationFn"
>;
export type UseRevokeApprovalResult = UseMutationResult<
  RevokeApprovalResult,
  Error,
  UseRevokeApprovalParams
>;

/**
 * React hook to revoke an app signer approval directly as author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useRevokeApproval(
  options: UseRevokeApprovalOptions = {},
): UseRevokeApprovalResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return revokeApproval({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseRevokeApprovalWithSigParams = Omit<
  RevokeApprovalWithSigParams,
  "writeContract"
>;
export type UseRevokeApprovalWithSigOptions = Omit<
  UseMutationOptions<
    RevokeApprovalWithSigResult,
    Error,
    UseRevokeApprovalWithSigParams
  >,
  "mutationFn"
>;
export type UseRevokeApprovalWithSigResult = UseMutationResult<
  RevokeApprovalWithSigResult,
  Error,
  UseRevokeApprovalWithSigParams
>;

/**
 * React hook to remove an app signer approval with signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useRevokeApprovalWithSig(
  options: UseRevokeApprovalWithSigOptions = {},
): UseRevokeApprovalWithSigResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return revokeApprovalWithSig({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}
