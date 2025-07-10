import { useCallback } from "react";
import { waitForTransactionReceipt } from "viem/actions";
import { useAccount, useConnectorClient, useSwitchChain } from "wagmi";
import type { QueryKey } from "@tanstack/react-query";
import { useDeleteComment } from "@ecp.eth/sdk/comments/react";
import { useReactionRemoval } from "@ecp.eth/shared/hooks";
import { type Comment } from "@ecp.eth/shared/schemas";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";

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
  const { address: connectedAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { mutateAsync: deleteCommentMutation } = useDeleteComment();
  const likeReactionRemoval = useReactionRemoval(COMMENT_REACTION_LIKE_CONTENT);
  const { data: client } = useConnectorClient();

  return useCallback(
    async (params: UseUnlikeCommentProps) => {
      if (!client) {
        throw new Error("No client");
      }

      if (!connectedAddress) {
        throw new Error("Wallet not connected");
      }

      const {
        comment,
        queryKey: parentCommentQueryKey,
        onBeforeStart,
        onFailed,
      } = params;

      const reaction = comment.viewerReactions?.[
        COMMENT_REACTION_LIKE_CONTENT
      ]?.find((reaction) => reaction.parentId === comment.id);

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

        await switchChainAsync({ chainId: comment.chainId });

        const { txHash } = await deleteCommentMutation({
          commentId: reaction.id,
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
      connectedAddress,
      deleteCommentMutation,
      likeReactionRemoval,
      switchChainAsync,
    ],
  );
};
