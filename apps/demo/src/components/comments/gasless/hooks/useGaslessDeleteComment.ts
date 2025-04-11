import type { Hex } from "viem";
import { useDeletePriorApprovedCommentMutation } from "./useDeletePriorApprovedCommentMutation";
import { useDeletePriorNotApprovedCommentMutation } from "./useDeletePriorNotApprovedCommentMutation";
import { useMutation } from "@tanstack/react-query";
import type { Comment } from "@ecp.eth/shared/schemas";

export function useGaslessDeleteComment({
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
