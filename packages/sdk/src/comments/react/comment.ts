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
  type PostCommentAsAuthorParams,
  type PostCommentAsAuthorResult,
  postCommentAsAuthor,
  type PostCommentParams,
  type PostCommentResult,
  postComment,
  type GetCommentParams,
  type GetCommentResult,
  getComment,
  type GetCommentIdParams,
  getCommentId,
  type DeleteCommentAsAuthorParams,
  type DeleteCommentAsAuthorResult,
  deleteCommentAsAuthor,
  type DeleteCommentParams,
  deleteComment,
  getNonce,
} from "../comment.js";
import { useCallback } from "react";

type UsePostCommentAsAuthorParams = Omit<
  PostCommentAsAuthorParams,
  "writeContract"
>;
type UsePostCommentAsAuthorOptions = Omit<
  UseMutationOptions<
    PostCommentAsAuthorResult,
    Error,
    UsePostCommentAsAuthorParams
  >,
  "mutationFn"
>;
type UsePostCommentAsAuthorResult = UseMutationResult<
  PostCommentAsAuthorResult,
  Error,
  UsePostCommentAsAuthorParams
>;

/**
 * React hook to post a comment as an author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function usePostCommentAsAuthor(
  options: UsePostCommentAsAuthorOptions = {}
): UsePostCommentAsAuthorResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return postCommentAsAuthor({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

type UsePostCommentParams = Omit<PostCommentParams, "writeContract">;
type UsePostCommentOptions = Omit<
  UseMutationOptions<PostCommentResult, Error, UsePostCommentParams>,
  "mutationFn"
>;
type UsePostCommentResult = UseMutationResult<
  PostCommentResult,
  Error,
  UsePostCommentParams
>;

/**
 * React hook to post a comment with author signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function usePostComment(
  options: UsePostCommentOptions = {}
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

type UseGetCommentParams = Omit<GetCommentParams, "readContract">;
type UseGetCommentOptions = Omit<
  UseQueryOptions<GetCommentResult, Error>,
  "queryKey" | "queryFn"
>;
type UseGetCommentResult = UseQueryResult<GetCommentResult, Error>;

/**
 * React hook to get a comment by ID
 *
 * @param params - The parameters for getting a comment
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetComment(
  params: UseGetCommentParams,
  options: UseGetCommentOptions = {}
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

type UseGetCommentIdParams = Omit<GetCommentIdParams, "readContract">;
type UseGetCommentIdOptions = Omit<
  UseQueryOptions<Hex, Error>,
  "queryKey" | "queryFn"
>;
type UseGetCommentIdResult = UseQueryResult<Hex, Error>;

/**
 * React hook to get the ID for a comment before it is posted
 *
 * @param params - The parameters for getting a comment ID
 * @param options - The options for the query
 * @returns The result of the query
 */
export function useGetCommentId(
  params: UseGetCommentIdParams,
  options: UseGetCommentIdOptions = {}
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

type UseDeleteCommentAsAuthorParams = Omit<
  DeleteCommentAsAuthorParams,
  "writeContract"
>;
type UseDeleteCommentAsAuthorOptions = Omit<
  UseMutationOptions<
    DeleteCommentAsAuthorResult,
    Error,
    UseDeleteCommentAsAuthorParams
  >,
  "mutationFn"
>;
type UseDeleteCommentAsAuthorResult = UseMutationResult<
  DeleteCommentAsAuthorResult,
  Error,
  UseDeleteCommentAsAuthorParams
>;

/**
 * React hook to delete a comment as an author
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useDeleteCommentAsAuthor(
  options: UseDeleteCommentAsAuthorOptions = {}
): UseDeleteCommentAsAuthorResult {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return deleteCommentAsAuthor({
        ...params,
        writeContract: writeContractAsync,
      });
    },
  });
}

type UseDeleteCommentParams = Omit<DeleteCommentParams, "writeContract">;
type UseDeleteCommentOptions = Omit<
  UseMutationOptions<{ txHash: Hex }, Error, UseDeleteCommentParams>,
  "mutationFn"
>;
type UseDeleteCommentResult = UseMutationResult<
  { txHash: Hex },
  Error,
  UseDeleteCommentParams
>;

/**
 * React hook to delete a comment with app signature verification
 *
 * @param options - The options for the mutation
 * @returns The result of the mutation
 */
export function useDeleteComment(
  options: UseDeleteCommentOptions = {}
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

/**
 * React hook to get the nonce for the author and app signer
 *
 * @param params - The parameters for getting a nonce
 * @param options - The options for the query
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
    [client]
  );
}
