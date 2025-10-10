import { useCallback } from "react";
import type { Hex } from "viem";
import { waitForTransactionReceipt } from "viem/actions";
import { useConnectorClient, useSwitchChain } from "wagmi";
import { useCommentDeletion } from "@ecp.eth/shared/hooks";
import type { QueryKey } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useEmbedConfig } from "../../EmbedConfigProvider";
import { submitDeleteCommentMutationFunction } from "../queries/deleteComment";
import { useReadWriteContractAsync } from "@/hooks/useReadWriteContractAsync";

type OnCommentDeleteParams = {
  commentId: Hex;
  queryKey: QueryKey;
};

type OnCommentDelete = (params: OnCommentDeleteParams) => Promise<void>;

export function useDeleteComment(): OnCommentDelete {
  const commentDeletion = useCommentDeletion();
  const { data: client } = useConnectorClient();
  const { address: author } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const config = useEmbedConfig();
  const { readContractAsync, writeContractAsync, signTypedDataAsync } =
    useReadWriteContractAsync();

  return useCallback(
    async (params: OnCommentDeleteParams) => {
      try {
        if (!client) {
          throw new Error("No client");
        }

        if (!author) {
          throw new Error("Wallet not connected");
        }

        const pendingOperation = await submitDeleteCommentMutationFunction({
          author,
          deleteCommentRequest: {
            commentId: params.commentId,
            chainId: config.chainId,
          },
          switchChainAsync: async (chainId: number) => {
            const result = await switchChainAsync({ chainId });
            return result;
          },
          readContractAsync,
          writeContractAsync,
          signTypedDataAsync,
          gasSponsorship: config.gasSponsorship,
        });

        commentDeletion.start({
          pendingOperation,
          queryKey: params.queryKey,
        });

        const txReceipt = await waitForTransactionReceipt(client, {
          hash: pendingOperation.txHash,
        });

        if (txReceipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentDeletion.success({
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentDeletion.error({
          commentId: params.commentId,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      client,
      author,
      config.chainId,
      config.gasSponsorship,
      readContractAsync,
      writeContractAsync,
      signTypedDataAsync,
      commentDeletion,
      switchChainAsync,
    ],
  );
}
