import {
  BadRequestResponseSchema,
  DeleteCommentResponseSchema,
  GaslessPostCommentResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedSchemaType,
  type GaslessPostCommentResponseSchemaType,
  type PendingCommentOperationSchemaType,
  type PreparedSignedGaslessPostCommentNotApprovedSchemaType,
  type Comment,
} from "@/lib/schemas";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { useConnectAccount } from "@ecp.eth/shared/hooks";
import {
  deletePriorApprovedCommentMutationFunction,
  deletePriorNotApprovedCommentMutationFunction,
  prepareSignedGaslessComment,
} from "./queries";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { InvalidCommentError, RateLimitedError } from "./errors";
import type { Hex, SignTypedDataParameters } from "viem";
import { fetchAuthorData } from "@ecp.eth/sdk";
import { publicEnv } from "@/publicEnv";
import type { IndexerAPIAuthorDataSchemaType } from "@ecp.eth/sdk/schemas";

type SubmitGaslessCommentVariables = {
  isApproved: boolean;
  content: string;
  parentId?: Hex;
  targetUri: string;
};

type SubmitGaslessCommentVariablesInternal = {
  author: Hex;
  content: string;
  parentId?: Hex;
  targetUri: string;
};

type PostPriorNotApprovedResult = GaslessPostCommentResponseSchemaType &
  PreparedSignedGaslessPostCommentNotApprovedSchemaType & {
    resolvedAuthor?: IndexerAPIAuthorDataSchemaType;
  };

export function useSubmitGaslessComment(
  options?: UseMutationOptions<
    PendingCommentOperationSchemaType,
    Error,
    SubmitGaslessCommentVariables
  >
) {
  const connectAccount = useConnectAccount();

  // post a comment that was previously approved, so not need for
  // user approval for signature for each interaction
  const postPriorApprovedCommentMutation = useMutation({
    mutationFn: async (variables: SubmitGaslessCommentVariablesInternal) => {
      return prepareSignedGaslessComment(
        // tell the server to submit right away after preparation of the comment data,
        // if the app is previously approved
        true,
        variables
      );
    },
  });

  // post a comment that was previously NOT approved,
  // will require user interaction for signature
  const postPriorNotApprovedSubmitMutation = useGaslessTransaction<
    PreparedSignedGaslessPostCommentNotApprovedSchemaType,
    PostPriorNotApprovedResult,
    SubmitGaslessCommentVariablesInternal
  >({
    async prepareSignTypedDataParams(variables) {
      const data = await prepareSignedGaslessComment(false, variables);

      return {
        signTypedDataParams:
          data.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: data,
      } satisfies {
        signTypedDataParams: SignTypedDataParameters;
        variables: PreparedSignedGaslessPostCommentNotApprovedSchemaType;
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/sign-comment/gasless", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            ...variables,
            authorSignature: signature,
          },
          bigintReplacer // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitedError();
        }

        if (response.status === 400) {
          throw new InvalidCommentError(
            BadRequestResponseSchema.parse(await response.json())
          );
        }

        throw new Error("Failed to post comment");
      }

      const { txHash } = GaslessPostCommentResponseSchema.parse(
        await response.json()
      );

      return {
        txHash,
        ...variables,
      };
    },
  });

  return useMutation<
    PendingCommentOperationSchemaType,
    Error,
    SubmitGaslessCommentVariables
  >({
    ...options,
    mutationFn: async ({
      isApproved,
      ...variables
    }: SubmitGaslessCommentVariables) => {
      const address = await connectAccount();

      const resolvedAuthor = await fetchAuthorData({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        address,
      }).catch((e) => {
        console.error(e);
        return undefined;
      });

      if (isApproved) {
        const result = await postPriorApprovedCommentMutation.mutateAsync({
          ...variables,
          author: address,
        });

        return {
          chainId: result.chainId,
          response: {
            data: result.commentData,
            hash: result.txHash,
            signature: result.appSignature,
          },
          txHash: result.txHash,
          resolvedAuthor,
          type: "gasless-preapproved",
        };
      }

      const result = await postPriorNotApprovedSubmitMutation.mutateAsync({
        ...variables,
        author: address,
      });

      return {
        chainId: result.chainId,
        response: {
          data: result.commentData,
          hash: result.txHash,
          signature: result.appSignature,
        },
        txHash: result.txHash,
        resolvedAuthor,
        type: "gasless-not-approved",
      };
    },
  });
}

/**
 * Deletes a comment that was previously approved, so not need for
 * user approval for signature on each transaction
 */
export function useDeletePriorApprovedCommentMutation({
  connectedAddress,
}: {
  connectedAddress: Hex | undefined;
}) {
  return useMutation({
    mutationFn: async (comment: Comment) => {
      if (!connectedAddress) {
        throw new Error("No connected address");
      }

      const result = await deletePriorApprovedCommentMutationFunction({
        address: connectedAddress,
        commentId: comment.id,
      });

      return result.txHash;
    },
  });
}

/**
 * Delete a comment that without prior approval, this will require user interaction for signature
 */
export function useDeletePriorNotApprovedCommentMutation({
  connectedAddress,
}: {
  connectedAddress: Hex | undefined;
}) {
  return useGaslessTransaction({
    async prepareSignTypedDataParams(comment: Comment) {
      if (!connectedAddress) {
        throw new Error("No address found");
      }

      const data = await deletePriorNotApprovedCommentMutationFunction({
        address: connectedAddress,
        commentId: comment.id,
      });

      return {
        signTypedDataParams:
          data.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: data,
      } satisfies {
        signTypedDataParams: SignTypedDataParameters;
        variables: PreparedSignedGaslessDeleteCommentNotApprovedSchemaType;
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/delete-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            ...variables,
            authorSignature: signature,
          },
          bigintReplacer // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        throw new Error("Failed to post approval signature");
      }

      const data = DeleteCommentResponseSchema.parse(await response.json());

      return data.txHash;
    },
  });
}

export function useDeleteGaslessComment({
  connectedAddress,
}: {
  connectedAddress: Hex | undefined;
}) {
  const deletePriorApprovedComment = useDeletePriorApprovedCommentMutation({
    connectedAddress,
  });

  const deletePriorNotApprovedComment =
    useDeletePriorNotApprovedCommentMutation({
      connectedAddress,
    });

  return useMutation({
    mutationFn: async ({
      comment,
      submitIfApproved,
    }: {
      comment: Comment;
      submitIfApproved: boolean;
    }) => {
      if (!connectedAddress) {
        throw new Error("No connected address");
      }

      if (submitIfApproved) {
        return deletePriorApprovedComment.mutateAsync(comment);
      }

      return deletePriorNotApprovedComment.mutateAsync(comment);
    },
  });
}
