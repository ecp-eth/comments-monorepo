import { useMutation } from "@tanstack/react-query";
import type { Comment } from "@ecp.eth/shared/schemas";
import { useConfig } from "wagmi";
import { useSIWEFetch } from "../../../../hooks/useSIWEFetch";
import { getWalletClient } from "@wagmi/core";
import { sendDeleteCommentGaslessly } from "../queries/deleteComment";
import { chain } from "@/lib/clientWagmi";
import { useConnectAccount } from "@ecp.eth/shared/hooks";

export function useGaslessDeleteComment() {
  const wagmiConfig = useConfig();
  const fetch = useSIWEFetch();
  const connectAccount = useConnectAccount();

  return useMutation({
    mutationFn: async ({
      comment,
      gasSponsorship,
    }: {
      comment: Pick<Comment, "id">;
      gasSponsorship: "gasless-preapproved" | "gasless-not-preapproved";
    }) => {
      const connectedAddress = await connectAccount();

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
