import { useGaslessTransaction } from "@ecp.eth/sdk/comments/react";
import type { Hex, SignTypedDataParameters } from "viem";
import {
  DeleteCommentResponseSchema,
  type PreparedSignedGaslessDeleteCommentNotApprovedSchemaType,
} from "@/lib/schemas";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import type { Comment } from "@ecp.eth/shared/schemas";
import { deletePriorNotApprovedCommentMutationFunction } from "../queries";

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
          bigintReplacer, // because typed data contains a bigint when parsed using our zod schemas
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
