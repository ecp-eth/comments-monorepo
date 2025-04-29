import {
  BadRequestResponseSchema,
  GaslessPostCommentResponseSchema,
  type GaslessPostCommentResponseSchemaType,
  type PreparedSignedGaslessPostCommentNotApprovedSchemaType,
} from "@/lib/schemas";
import { useGaslessTransaction } from "@ecp.eth/sdk/comments/react";
import type { IndexerAPIAuthorDataSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { useConnectAccount } from "@ecp.eth/shared/hooks";
import type { PendingPostCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { Hex, SignTypedDataParameters } from "viem";
import { prepareSignedGaslessComment } from "../queries";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { InvalidCommentError, RateLimitedError } from "../../core/errors";
import { fetchAuthorData } from "@ecp.eth/sdk/indexer";
import { publicEnv } from "@/publicEnv";

type SubmitGaslessCommentVariables =
  | {
      isApproved: boolean;
      content: string;
      targetUri: string;
    }
  | {
      isApproved: boolean;
      content: string;
      parentId: Hex;
    };

type SubmitGaslessCommentVariablesInternal =
  | {
      author: Hex;
      content: string;
      targetUri: string;
    }
  | {
      author: Hex;
      content: string;
      parentId: Hex;
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
      };
    },
  });
}
