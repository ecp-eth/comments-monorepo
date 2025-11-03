import { useCallback } from "react";
import { useAccount, useConfig, usePublicClient, useSwitchChain } from "wagmi";
import type { QueryKey } from "@tanstack/react-query";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import { useReactionSubmission } from "@ecp.eth/shared/hooks";
import {
  PendingPostCommentOperationSchemaType,
  type Comment,
} from "@ecp.eth/shared/schemas";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { submitPostComment } from "../queries/postComment";
import { useEmbedConfig } from "@/components/EmbedConfigProvider";
import { getWalletClient, waitForTransactionReceipt } from "@wagmi/core";

type UseLikeCommentProps = {
  /**
   * Comment to like
   */
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called before transaction was created.
   */
  onBeforeStart?: () => void;
  /**
   * Called when transaction was successful.
   */
  onSuccess?: () => void;
  /**
   * Called when transaction was failed.
   */
  onFailed?: (error: unknown) => void;
};

export const useLikeComment = () => {
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const likeReactionSubmission = useReactionSubmission(
    COMMENT_REACTION_LIKE_CONTENT,
  );
  const { address: connectedAddress } = useAccount();
  const { channelId, gasSponsorship } = useEmbedConfig();
  const publicClient = usePublicClient();

  return useCallback(
    async (params: UseLikeCommentProps) => {
      if (!publicClient) {
        throw new Error(
          "No wagmi client found, this component must be used within a wagmi provider",
        );
      }

      if (!connectedAddress) {
        throw new Error("Wallet not connected");
      }

      const walletClient = await getWalletClient(wagmiConfig);

      const { comment, queryKey, onBeforeStart, onFailed, onSuccess } = params;

      if (
        (comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT]?.length ??
          0) > 0
      ) {
        throw new Error("Comment already liked");
      }

      onBeforeStart?.();

      let pendingOperation: PendingPostCommentOperationSchemaType | undefined =
        undefined;

      try {
        pendingOperation = {
          ...(await submitPostComment({
            requestPayload: {
              author: connectedAddress,
              content: COMMENT_REACTION_LIKE_CONTENT,
              commentType: COMMENT_TYPE_REACTION,
              parentId: comment.id,
              chainId: comment.chainId,
              channelId,
              metadata: [],
            },
            switchChainAsync(chainId) {
              return switchChainAsync({ chainId });
            },
            publicClient,
            walletClient,
            gasSponsorship: gasSponsorship,
          })),
          references: [],
        };

        likeReactionSubmission.start({
          ...params,
          queryKey,
          pendingOperation,
        });

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        onSuccess?.();

        likeReactionSubmission.success({
          ...params,
          queryKey,
          pendingOperation,
        });
      } catch (e) {
        onFailed?.(e);

        if (pendingOperation) {
          likeReactionSubmission.error({
            ...params,
            queryKey,
            pendingOperation,
          });
        }

        throw e;
      }
    },
    [
      channelId,
      connectedAddress,
      gasSponsorship,
      likeReactionSubmission,
      publicClient,
      switchChainAsync,
      wagmiConfig,
    ],
  );
};
