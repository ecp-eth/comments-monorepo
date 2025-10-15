import { useEmbedConfig } from "@/components/EmbedConfigProvider";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { useCallback } from "react";
import { submitPostComment } from "../queries/submitPostComment";
import { useConfig, useSwitchChain } from "wagmi";
import { useReadWriteContractAsync } from "@/hooks/useReadWriteContractAsync";
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
  const { readContractAsync, writeContractAsync, signTypedDataAsync } =
    useReadWriteContractAsync();

  return useCallback<UsePostCommentProps>(
    async ({
      author,
      content,
      references,
      targetUriOrParentId,
      onSubmitStart,
      queryKey,
    }) => {
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
          signTypedDataAsync,
          readContractAsync,
          writeContractAsync,
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
      signTypedDataAsync,
      switchChainAsync,
      wagmiConfig,
      writeContractAsync,
    ],
  );
}
