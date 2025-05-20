import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { usePublicClient, useWriteContract } from "wagmi";
import type { Hex } from "../../core/schemas.js";
import {
  type PostCommentParams,
  type PostCommentResult,
  postComment,
  type PostCommentWithApprovalParams,
  type PostCommentWithApprovalResult,
  postCommentWithApproval,
  type GetCommentParams,
  type GetCommentResult,
  getComment,
  type GetCommentIdParams,
  getCommentId,
  type DeleteCommentParams,
  type DeleteCommentResult,
  deleteComment,
  type DeleteCommentWithApprovalParams,
  deleteCommentWithApproval,
  getNonce,
  editCommentWithApproval,
  type EditCommentWithApprovalParams,
  type EditCommentWithApprovalResult,
  editComment,
  type EditCommentParams,
  type EditCommentResult,
  getDeleteCommentHash,
  type GetEditCommentHashParams,
  getEditCommentHash,
  type GetDeleteCommentHashParams,
} from "../comment.js";
import { useCallback } from "react";

export type UsePostCommentParams = Omit<PostCommentParams, "writeContract">;
export type UsePostCommentOptions = Omit<
  UseMutationOptions<PostCommentResult, Error, UsePostCommentParams>,
  "mutationFn"
>;
export type UsePostCommentResult = UseMutationResult<
  PostCommentResult,
  Error,
  UsePostCommentParams
>;

/**
 * React hook to post a comment as an author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function usePostComment(
  options: UsePostCommentOptions = {},
): UsePostCommentResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return postComment({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UsePostCommentWithApprovalParams = Omit<
  PostCommentWithApprovalParams,
  "writeContract"
>;
export type UsePostCommentWithApprovalOptions = Omit<
  UseMutationOptions<
    PostCommentWithApprovalResult,
    Error,
    UsePostCommentWithApprovalParams
  >,
  "mutationFn"
>;
export type UsePostCommentWithApprovalResult = UseMutationResult<
  PostCommentWithApprovalResult,
  Error,
  UsePostCommentWithApprovalParams
>;

/**
 * React hook to post a comment with author signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function usePostCommentWithApproval(
  options: UsePostCommentWithApprovalOptions = {},
): UsePostCommentWithApprovalResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return postCommentWithApproval({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseGetCommentParams = Omit<GetCommentParams, "readContract">;
export type UseGetCommentOptions = Omit<
  UseQueryOptions<GetCommentResult, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetCommentResult = UseQueryResult<GetCommentResult, Error>;

/**
 * React hook to get a comment by ID
 *
 * @param params - The parameters for getting a comment
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetComment(
  params: UseGetCommentParams,
  options: UseGetCommentOptions = {},
): UseGetCommentResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["comment", params.commentId, params.commentsAddress],
    queryFn: async () => {
      const result = await getComment({
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

export type UseGetCommentIdParams = Omit<GetCommentIdParams, "readContract">;
export type UseGetCommentIdOptions = Omit<
  UseQueryOptions<Hex, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetCommentIdResult = UseQueryResult<Hex, Error>;

/**
 * React hook to get the ID for a comment before it is posted
 *
 * @param params - The parameters for getting a comment ID
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetCommentId(
  params: UseGetCommentIdParams,
  options: UseGetCommentIdOptions = {},
): UseGetCommentIdResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["commentId", params.commentData, params.commentsAddress],
    queryFn: async () => {
      const result = await getCommentId({
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

export type UseDeleteCommentParams = Omit<DeleteCommentParams, "writeContract">;
export type UseDeleteCommentOptions = Omit<
  UseMutationOptions<DeleteCommentResult, Error, UseDeleteCommentParams>,
  "mutationFn"
>;
export type UseDeleteCommentResult = UseMutationResult<
  DeleteCommentResult,
  Error,
  UseDeleteCommentParams
>;

/**
 * React hook to delete a comment as an author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useDeleteComment(
  options: UseDeleteCommentOptions = {},
): UseDeleteCommentResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return deleteComment({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseDeleteCommentWithApprovalParams = Omit<
  DeleteCommentWithApprovalParams,
  "writeContract"
>;
export type UseDeleteCommentWithApprovalOptions = Omit<
  UseMutationOptions<
    { txHash: Hex },
    Error,
    UseDeleteCommentWithApprovalParams
  >,
  "mutationFn"
>;
export type UseDeleteCommentWithApprovalResult = UseMutationResult<
  { txHash: Hex },
  Error,
  UseDeleteCommentWithApprovalParams
>;

/**
 * React hook to delete a comment with app signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useDeleteCommentWithApproval(
  options: UseDeleteCommentWithApprovalOptions = {},
): UseDeleteCommentWithApprovalResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return deleteCommentWithApproval({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

/**
 * React hook to get the nonce for the author and app signer
 *
 * @returns The result of the query
 */
export function useGetNonce(): typeof getNonce {
  const client = usePublicClient();

  return useCallback(
    (params) => {
      return getNonce({
        ...params,
        readContract: async (params) => {
          if (!client) {
            throw new Error("Client not found");
          }

          return client.readContract(params);
        },
      });
    },
    [client],
  );
}

export type UseEditCommentWithApprovalParams = Omit<
  EditCommentWithApprovalParams,
  "writeContract"
>;
export type UseEditCommentWithApprovalOptions = Omit<
  UseMutationOptions<
    EditCommentWithApprovalResult,
    Error,
    UseEditCommentWithApprovalParams
  >,
  "mutationFn"
>;
export type UseEditCommentWithApprovalResult = UseMutationResult<
  EditCommentWithApprovalResult,
  Error,
  UseEditCommentWithApprovalParams
>;

/**
 * React hook to edit a comment with app signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useEditCommentWithApproval(
  options: UseEditCommentWithApprovalOptions = {},
): UseEditCommentWithApprovalResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return editCommentWithApproval({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseEditCommentParams = Omit<EditCommentParams, "writeContract">;
export type UseEditCommentOptions = Omit<
  UseMutationOptions<EditCommentResult, Error, UseEditCommentParams>,
  "mutationFn"
>;
export type UseEditCommentResult = UseMutationResult<
  EditCommentResult,
  Error,
  UseEditCommentParams
>;

/**
 * React hook to edit a comment as an author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useEditComment(
  options: UseEditCommentOptions = {},
): UseEditCommentResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return editComment({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

export type UseGetEditCommentHashParams = Omit<
  GetEditCommentHashParams,
  "readContract"
>;
export type UseGetEditCommentHashOptions = Omit<
  UseQueryOptions<Hex, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetEditCommentHashResult = UseQueryResult<Hex, Error>;

/**
 * React hook to get the hash for editing a comment
 *
 * @param params - The parameters for getting the edit comment hash
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetEditCommentHash(
  params: UseGetEditCommentHashParams,
  options: UseGetEditCommentHashOptions = {},
): UseGetEditCommentHashResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["editCommentHash", params.edit, params.commentsAddress],
    queryFn: async () => {
      const result = await getEditCommentHash({
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

export type UseGetDeleteCommentHashParams = Omit<
  GetDeleteCommentHashParams,
  "readContract"
>;
export type UseGetDeleteCommentHashOptions = Omit<
  UseQueryOptions<Hex, Error>,
  "queryKey" | "queryFn"
>;
export type UseGetDeleteCommentHashResult = UseQueryResult<Hex, Error>;

/**
 * React hook to get the hash for deleting a comment
 *
 * @param params - The parameters for getting the delete comment hash
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetDeleteCommentHash(
  params: UseGetDeleteCommentHashParams,
  options: UseGetDeleteCommentHashOptions = {},
): UseGetDeleteCommentHashResult {
  const client = usePublicClient();

  return useQuery({
    ...options,
    enabled: options.enabled && !!client,
    queryKey: ["deleteCommentHash", params.commentId, params.commentsAddress],
    queryFn: async () => {
      const result = await getDeleteCommentHash({
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
