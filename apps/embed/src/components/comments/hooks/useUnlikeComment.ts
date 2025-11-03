import { useCallback } from "react";
import { waitForTransactionReceipt } from "viem/actions";
import { useAccount, useConnectorClient, useSwitchChain } from "wagmi";
import type { QueryKey } from "@tanstack/react-query";

import { useReactionRemoval } from "@ecp.eth/shared/hooks";
import { type Comment } from "@ecp.eth/shared/schemas";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { submitDeleteComment } from "../queries/deleteComment";
import { useEmbedConfig } from "@/components/EmbedConfigProvider";
import { useReadWriteContractAsync } from "@/hooks/useReadWriteContractAsync";

type UseUnlikeCommentProps = {
  /**
   * Comment to unlike
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
   * Called when transaction was failed.
   */
  onFailed?: (error: unknown) => void;
};

export const useUnlikeComment = () => {
  const { address: viewer } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const likeReactionRemoval = useReactionRemoval(COMMENT_REACTION_LIKE_CONTENT);
  const { data: client } = useConnectorClient();
  const config = useEmbedConfig();
  const { writeContractAsync, signTypedDataAsync } =
    useReadWriteContractAsync();

  return useCallback(
    async (params: UseUnlikeCommentProps) => {
      if (!client) {
        throw new Error("No client");
      }

      if (!viewer) {
        throw new Error("Wallet not connected");
      }

      const {
        comment,
        queryKey: parentCommentQueryKey,
        onBeforeStart,
        onFailed,
      } = params;

      const reactions =
        comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT] ?? [];

      const reaction = reactions[reactions.length - 1];

      if (!reaction) {
        throw new Error("Reaction not found");
      }

      const reactionRemovalParams = {
        reactionId: reaction.id,
        parentCommentId: comment.id,
        queryKey: parentCommentQueryKey,
      };

      try {
        onBeforeStart?.();

        const commentId = reaction.id;
        const { txHash } = await submitDeleteComment({
          requestPayload: {
            author: viewer,
            commentId: commentId,
            chainId: config.chainId,
          },
          switchChainAsync: async (chainId: number) => {
            const result = await switchChainAsync({ chainId });
            return result;
          },
          writeContractAsync,
          signTypedDataAsync,
          gasSponsorship: config.gasSponsorship,
        });

        // Optimistically remove the reaction from the UI
        likeReactionRemoval.start(reactionRemovalParams);

        const receipt = await waitForTransactionReceipt(client, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        likeReactionRemoval.success(reactionRemovalParams);
      } catch (e) {
        onFailed?.(e);

        likeReactionRemoval.error(reactionRemovalParams);

        throw e;
      }
    },
    [
      client,
      config.chainId,
      config.gasSponsorship,
      viewer,
      likeReactionRemoval,
      signTypedDataAsync,
      switchChainAsync,
      writeContractAsync,
    ],
  );
};
