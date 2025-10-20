import { useEmbedConfig } from "@/components/EmbedConfigProvider";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { useCallback } from "react";
import { submitPostComment } from "../queries/submitPostComment";
import {
  useWalletClient,
  useConfig,
  useSwitchChain,
  usePublicClient,
} from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useCommentSubmission } from "@ecp.eth/shared/hooks";
import { QueryKey } from "@tanstack/react-query";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";

type UsePostCommentProps = (params: {
  queryKey: QueryKey;
  author: Hex;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  targetUriOrParentId: { parentId: Hex } | { targetUri: string };
  onSubmitStart?: () => void;
}) => Promise<void>;

export function usePostComment() {
  const wagmiConfig = useConfig();
  const commentSubmission = useCommentSubmission();
  const { chainId, channelId, gasSponsorship } = useEmbedConfig();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  if (!publicClient) {
    throw new Error(
      "No wagmi client found, this component must be used within a wagmi provider",
    );
  }

  return useCallback<UsePostCommentProps>(
    async ({
      author,
      content,
      references,
      targetUriOrParentId,
      onSubmitStart,
      queryKey,
    }) => {
      if (!walletClient) {
        throw new Error("No wallet client found");
      }

      const pendingOperation = {
        ...(await submitPostComment({
          author: author,
          postCommentRequest: {
            chainId,
            content,
            channelId,
            ...("parentId" in targetUriOrParentId
              ? { parentId: targetUriOrParentId.parentId }
              : { targetUri: targetUriOrParentId.targetUri }),
          },
          switchChainAsync(chainId) {
            return switchChainAsync({ chainId });
          },
          publicClient,
          walletClient,
          gasSponsorship: gasSponsorship,
        })),
        references,
      };

      try {
        commentSubmission.start({
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

        commentSubmission.success({
          queryKey,
          pendingOperation,
        });
      } catch (e) {
        commentSubmission.error({
          commentId: pendingOperation.response.data.id,
          queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      chainId,
      channelId,
      commentSubmission,
      gasSponsorship,
      publicClient,
      switchChainAsync,
      wagmiConfig,
      walletClient,
    ],
  );
}
