import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { Comment } from "@ecp.eth/shared/schemas";
import { sendDeleteCommentGaslessly } from "../queries/deleteComment";
import { useConfig } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { chain } from "@/lib/clientWagmi";

/**
 * Deletes a comment that was previously approved, so not need for
 * user approval for signature on each transaction
 */
export function useDeletePriorNotApprovedCommentMutation({
  connectedAddress,
}: {
  connectedAddress: Hex | undefined;
}) {
  const wagmiConfig = useConfig();
  return useMutation({
    mutationFn: async (comment: Comment) => {
      if (!connectedAddress) {
        throw new Error("No connected address");
      }

      const walletClient = await getWalletClient(wagmiConfig);

      const result = await sendDeleteCommentGaslessly({
        requestPayload: {
          chainId: chain.id,
          commentId: comment.id,
          author: connectedAddress,
        },
        walletClient,
        gasSponsorship: "not-preapproved",
      });

      return result.txHash;
    },
  });
}
