import {
  BadRequestResponseSchema,
  GaslessPostCommentResponseSchema,
  type GaslessPostCommentResponseSchemaType,
  type PreparedSignedGaslessPostCommentNotApprovedSchemaType,
  GaslessEditResponseSchema,
  type GaslessEditResponseSchemaType,
  type PrepareSignedGaslessEditCommentNotApprovedResponseSchemaType,
} from "@/lib/schemas";
import { useGaslessTransaction } from "@ecp.eth/sdk/comments/react";
import type {
  IndexerAPIAuthorDataSchemaType,
  IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { useConnectAccount } from "@ecp.eth/shared/hooks";
import type {
  PendingEditCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { Hex, SignTypedDataParameters } from "viem";
import {
  prepareSignedGaslessComment,
  prepareSignedGaslessEditComment,
} from "../queries";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { InvalidCommentError, RateLimitedError } from "@ecp.eth/shared/errors";
import { fetchAuthorData } from "@ecp.eth/sdk/indexer";
import { publicEnv } from "@/publicEnv";
import type { MetadataEntry } from "@ecp.eth/sdk/comments";

type SubmitGaslessCommentVariables =
  | {
      isApproved: boolean;
      content: string;
      targetUri: string;
      metadata: MetadataEntry[];
      commentType?: number;
      references: IndexerAPICommentReferencesSchemaType;
    }
  | {
      isApproved: boolean;
      content: string;
      parentId: Hex;
      metadata: MetadataEntry[];
      commentType?: number;
      references: IndexerAPICommentReferencesSchemaType;
    };

type SubmitGaslessCommentVariablesInternal =
  | {
      author: Hex;
      content: string;
      targetUri: string;
      metadata: MetadataEntry[];
      commentType?: number;
    }
  | {
      author: Hex;
      content: string;
      parentId: Hex;
      metadata: MetadataEntry[];
      commentType?: number;
    };

type PostPriorNotApprovedResult = GaslessPostCommentResponseSchemaType &
  PreparedSignedGaslessPostCommentNotApprovedSchemaType & {
    resolvedAuthor?: IndexerAPIAuthorDataSchemaType;
  };

export function useGaslessSubmitComment(
  options?: UseMutationOptions<
    PendingPostCommentOperationSchemaType,
    Error,
    SubmitGaslessCommentVariables
  >,
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
        variables,
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
        signTypedDataParams: data.signTypedDataParams,
        variables: data,
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
          bigintReplacer, // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitedError();
        }

        if (response.status === 400) {
          throw new InvalidCommentError(
            BadRequestResponseSchema.parse(await response.json()),
          );
        }

        throw new Error("Failed to post comment");
      }

      const { txHash } = GaslessPostCommentResponseSchema.parse(
        await response.json(),
      );

      return {
        txHash,
        ...variables,
      };
    },
  });

  return useMutation<
    PendingPostCommentOperationSchemaType,
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
          response: {
            data: result.commentData,
            hash: result.txHash,
            signature: result.appSignature,
          },
          txHash: result.txHash,
          resolvedAuthor,
          type: "gasless-preapproved",
          action: "post",
          chainId: result.chainId,
          state: { status: "pending" },
          references: variables.references,
        };
      }

      const result = await postPriorNotApprovedSubmitMutation.mutateAsync({
        ...variables,
        author: address,
      });

      return {
        response: {
          data: result.commentData,
          hash: result.txHash,
          signature: result.appSignature,
        },
        txHash: result.txHash,
        resolvedAuthor,
        type: "gasless-not-approved",
        action: "post",
        chainId: result.chainId,
        state: { status: "pending" },
        references: variables.references,
      };
    },
  });
}

type SubmitGaslessEditCommentVariables = {
  content: string;
  isApproved: boolean;
  commentId: Hex;
  metadata: MetadataEntry[];
};

type SubmitGaslessEditCommentVariablesInternal = {
  author: Hex;
  content: string;
  commentId: Hex;
  metadata: MetadataEntry[];
};

type EditPriorNotApprovedResult = GaslessEditResponseSchemaType &
  PrepareSignedGaslessEditCommentNotApprovedResponseSchemaType;

export function useGaslessEditComment(
  options?: UseMutationOptions<
    PendingEditCommentOperationSchemaType,
    Error,
    SubmitGaslessEditCommentVariables
  >,
) {
  const connectAccount = useConnectAccount();

  // post a comment that was previously approved, so not need for
  // user approval for signature for each interaction
  const editPriorApprovedCommentMutation = useMutation({
    mutationFn: async (
      variables: SubmitGaslessEditCommentVariablesInternal,
    ) => {
      return prepareSignedGaslessEditComment(
        // tell the server to submit right away after preparation of the comment data,
        // if the app is previously approved
        true,
        variables,
      );
    },
  });

  // post a comment that was previously NOT approved,
  // will require user interaction for signature
  const editPriorNotApprovedSubmitMutation = useGaslessTransaction<
    PrepareSignedGaslessEditCommentNotApprovedResponseSchemaType,
    EditPriorNotApprovedResult,
    SubmitGaslessEditCommentVariablesInternal
  >({
    async prepareSignTypedDataParams(variables) {
      const data = await prepareSignedGaslessEditComment(false, variables);

      return {
        signTypedDataParams:
          data.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: data,
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/sign-edit-comment/gasless", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            ...variables,
            authorSignature: signature,
          },
          bigintReplacer, // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitedError();
        }

        if (response.status === 400) {
          throw new InvalidCommentError(
            BadRequestResponseSchema.parse(await response.json()),
          );
        }

        throw new Error("Failed to edit comment");
      }

      const { txHash } = GaslessEditResponseSchema.parse(await response.json());

      return {
        txHash,
        ...variables,
      };
    },
  });

  return useMutation<
    PendingEditCommentOperationSchemaType,
    Error,
    SubmitGaslessEditCommentVariables
  >({
    ...options,
    mutationFn: async ({
      isApproved,
      ...variables
    }: SubmitGaslessEditCommentVariables) => {
      const address = await connectAccount();

      if (isApproved) {
        const result = await editPriorApprovedCommentMutation.mutateAsync({
          ...variables,
          author: address,
        });

        return {
          response: {
            data: result.edit,
            hash: result.txHash,
            signature: result.appSignature,
          },
          txHash: result.txHash,
          type: "gasless-preapproved",
          action: "edit",
          chainId: result.chainId,
          state: { status: "pending" },
        };
      }

      const result = await editPriorNotApprovedSubmitMutation.mutateAsync({
        ...variables,
        author: address,
      });

      return {
        response: {
          data: result.edit,
          hash: result.txHash,
          signature: result.appSignature,
        },
        txHash: result.txHash,
        type: "gasless-not-approved",
        action: "edit",
        chainId: result.chainId,
        state: { status: "pending" },
      };
    },
  });
}
