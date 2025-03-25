import { useMutation } from "@tanstack/react-query";
import { Hex } from "viem";
import { useAccount } from "wagmi";
import { deleteComment } from "../lib/comments";

export function useDeleteComment() {
  const { address: accountAddress } = useAccount();

  return useMutation({
    mutationFn: async (commentId: Hex) => {
      if (!accountAddress) {
        throw new Error("No account address found");
      }

      return deleteComment({ commentId });
    },
  });
}
