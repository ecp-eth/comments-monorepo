import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { Comment } from "@/lib/schemas";
import { deletePriorApprovedCommentMutationFunction } from "../queries";

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
