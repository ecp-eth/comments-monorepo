import type { Hex } from "viem";
import { useMutation } from "@tanstack/react-query";
import type { Comment } from "@ecp.eth/shared/schemas";
import { useConfig } from "wagmi";
import { useSIWEFetch } from "../../../../hooks/useSIWEFetch";
import { getWalletClient } from "@wagmi/core";
import { sendDeleteCommentGaslessly } from "../queries/deleteComment";
import { chain } from "@/lib/clientWagmi";

export function useGaslessDeleteComment({
  connectedAddress,
}: {
  connectedAddress: Hex | undefined;
}) {
  const wagmiConfig = useConfig();
  const fetch = useSIWEFetch();

  return useMutation({
    mutationFn: async ({
      comment,
      gasSponsorship,
    }: {
      comment: Comment;
      gasSponsorship: "gasless-preapproved" | "gasless-not-preapproved";
    }) => {
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
        gasSponsorship,
        fetch,
      });

      return result.txHash;
    },
  });
}
