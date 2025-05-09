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
  type AddApprovalAsAuthorParams,
  type AddApprovalAsAuthorResult,
  addApprovalAsAuthor,
  type AddApprovalParams,
  type AddApprovalResult,
  addApproval,
  type RevokeApprovalAsAuthorParams,
  type RevokeApprovalAsAuthorResult,
  revokeApprovalAsAuthor,
  type RevokeApprovalParams,
  type RevokeApprovalResult,
  revokeApproval,
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
  options: UseIsApprovedOptions = {}
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

export type UseAddApprovalAsAuthorParams = Omit<
  AddApprovalAsAuthorParams,
  "writeContract"
>;
export type UseAddApprovalAsAuthorOptions = Omit<
  UseMutationOptions<
    AddApprovalAsAuthorResult,
    Error,
    UseAddApprovalAsAuthorParams
  >,
  "mutationFn"
>;
export type UseAddApprovalAsAuthorResult = UseMutationResult<
  AddApprovalAsAuthorResult,
  Error,
  UseAddApprovalAsAuthorParams
>;

/**
 * React hook to approve an app signer directly as author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useAddApprovalAsAuthor(
  options: UseAddApprovalAsAuthorOptions = {}
): UseAddApprovalAsAuthorResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return addApprovalAsAuthor({
        ...params,
        writeContract: writeContractAsync,
      });
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
 * React hook to add an app signer approval with signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useAddApproval(
  options: UseAddApprovalOptions = {}
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

export type UseRevokeApprovalAsAuthorParams = Omit<
  RevokeApprovalAsAuthorParams,
  "writeContract"
>;
export type UseRevokeApprovalAsAuthorOptions = Omit<
  UseMutationOptions<
    RevokeApprovalAsAuthorResult,
    Error,
    UseRevokeApprovalAsAuthorParams
  >,
  "mutationFn"
>;
export type UseRevokeApprovalAsAuthorResult = UseMutationResult<
  RevokeApprovalAsAuthorResult,
  Error,
  UseRevokeApprovalAsAuthorParams
>;

/**
 * React hook to revoke an app signer approval directly as author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useRevokeApprovalAsAuthor(
  options: UseRevokeApprovalAsAuthorOptions = {}
): UseRevokeApprovalAsAuthorResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return revokeApprovalAsAuthor({
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
 * React hook to remove an app signer approval with signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useRevokeApproval(
  options: UseRevokeApprovalOptions = {}
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
