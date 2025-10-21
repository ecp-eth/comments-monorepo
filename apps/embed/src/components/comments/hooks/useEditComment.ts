import { useCallback } from "react";
import { waitForTransactionReceipt } from "@wagmi/core";
import {
  useConfig,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { useCommentEdition } from "@ecp.eth/shared/hooks";
import { useEmbedConfig } from "@/components/EmbedConfigProvider";
import { submitEditComment } from "@/components/comments/queries/submitEditComment";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { useReadWriteContractAsync } from "@/hooks/useReadWriteContractAsync";
import { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { QueryKey } from "@tanstack/react-query";
import type { Comment } from "@ecp.eth/shared/schemas";

type UseEditCommentProps = (params: {
  queryKey: QueryKey;
  /**
   * Comment to edit
   */
  comment: Comment;
  /**
   * Author of the comment
   */
  author: Hex;
  /**
   * New content of the comment
   */
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  onSubmitStart?: () => void;
}) => Promise<void>;

export function useEditComment() {
  const wagmiConfig = useConfig();
  const commentEdition = useCommentEdition();
  const { switchChainAsync } = useSwitchChain();
  const embedConfig = useEmbedConfig();
  const { chainId } = embedConfig;

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  if (!publicClient) {
    throw new Error("No public client found");
  }

  return useCallback<UseEditCommentProps>(
    async ({
      author,
      content,
      onSubmitStart,
      queryKey,
      comment,
      references,
    }) => {
      if (!walletClient) {
        throw new Error("No wallet client found");
      }

      const pendingOperation = {
        ...(await submitEditComment({
          address: author,
          comment,
          editRequest: {
            chainId,
            content,
          },
          switchChainAsync(chainId) {
            return switchChainAsync({ chainId });
          },
          publicClient,
          walletClient,
          gasSponsorship: embedConfig.gasSponsorship,
        })),
        references,
      };

      try {
        commentEdition.start({
          queryKey,
          pendingOperation,
        });

        onSubmitStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentEdition.success({
          queryKey,
          pendingOperation,
        });
      } catch (e) {
        commentEdition.error({
          commentId: pendingOperation.response.data.commentId,
          queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      chainId,
      commentEdition,
      embedConfig.gasSponsorship,
      publicClient,
      switchChainAsync,
      wagmiConfig,
      walletClient,
    ],
  );
}
