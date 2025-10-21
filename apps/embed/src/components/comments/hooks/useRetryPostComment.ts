import { useCommentRetrySubmission } from "@ecp.eth/shared/hooks";
import type { Comment } from "@ecp.eth/shared/schemas";
import type { QueryKey } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  useConfig,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { submitPostComment } from "../queries/submitPostComment";
import type { Hex } from "viem";
import { TX_RECEIPT_TIMEOUT } from "../../../lib/constants";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useEmbedConfig } from "@/components/EmbedConfigProvider";

export type OnRetryPostCommentParams = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called when transaction was created.
   */
  onStart?: () => void;
};

export type OnRetryPostComment = (
  params: OnRetryPostCommentParams,
) => Promise<void>;

type UseRetryPostCommentParams = {
  connectedAddress: Hex | undefined;
};

export function useRetryPostComment({
  connectedAddress,
}: UseRetryPostCommentParams): OnRetryPostComment {
  const wagmiConfig = useConfig();
  const commentRetrySubmission = useCommentRetrySubmission();
  const { switchChainAsync } = useSwitchChain();
  const embedConfig = useEmbedConfig();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  if (!publicClient) {
    throw new Error("No public client found");
  }

  return useCallback<OnRetryPostComment>(
    async (params) => {
      if (!walletClient) {
        throw new Error("No wallet client found");
      }
      const { comment } = params;

      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type !== "non-gasless") {
        throw new Error("Only non-gasless comments can be retried");
      }

      if (comment.pendingOperation.action !== "post") {
        throw new Error("Only post comments can be retried");
      }

      const pendingOperation = {
        ...(await submitPostComment({
          author: connectedAddress,
          postCommentRequest: {
            chainId: comment.pendingOperation.chainId,
            content: comment.content,
            ...(comment.parentId
              ? {
                  parentId: comment.parentId,
                }
              : {
                  targetUri: comment.targetUri,
                }),
          },
          switchChainAsync(chainId) {
            return switchChainAsync({ chainId });
          },
          publicClient,
          walletClient,
          gasSponsorship: embedConfig.gasSponsorship,
        })),
        references: comment.references,
      };

      try {
        commentRetrySubmission.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentRetrySubmission.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentRetrySubmission.error({
          pendingOperation,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      walletClient,
      connectedAddress,
      publicClient,
      embedConfig.gasSponsorship,
      switchChainAsync,
      commentRetrySubmission,
      wagmiConfig,
    ],
  );
}
