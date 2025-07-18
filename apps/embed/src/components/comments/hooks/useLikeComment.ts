import { useCallback } from "react";
import { waitForTransactionReceipt } from "viem/actions";
import { useAccount, useConnectorClient, useSwitchChain } from "wagmi";
import type { QueryKey } from "@tanstack/react-query";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import { usePostComment } from "@ecp.eth/sdk/comments/react";
import { useReactionSubmission } from "@ecp.eth/shared/hooks";
import {
  PendingPostCommentOperationSchemaType,
  type Comment,
} from "@ecp.eth/shared/schemas";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { submitCommentMutationFunction } from "../queries";

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
  const { switchChainAsync } = useSwitchChain();
  const { mutateAsync: postCommentMutation } = usePostComment();
  const likeReactionSubmission = useReactionSubmission(
    COMMENT_REACTION_LIKE_CONTENT,
  );
  const { address: connectedAddress } = useAccount();
  const { data: client } = useConnectorClient();

  return useCallback(
    async (params: UseLikeCommentProps) => {
      const { comment, queryKey, onBeforeStart, onFailed, onSuccess } = params;

      if (!client) {
        throw new Error("No client");
      }

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
        pendingOperation = await submitCommentMutationFunction({
          author: connectedAddress,
          commentRequest: {
            chainId: comment.chainId,
            content: COMMENT_REACTION_LIKE_CONTENT,
            commentType: COMMENT_TYPE_REACTION,
            parentId: comment.id,
          },
          references: [],
          switchChainAsync(chainId) {
            return switchChainAsync({ chainId });
          },
          async writeContractAsync({
            signCommentResponse: { signature: appSignature, data: commentData },
          }) {
            const { txHash } = await postCommentMutation({
              appSignature,
              comment: commentData,
            });

            return txHash;
          },
        });

        likeReactionSubmission.start({
          ...params,
          queryKey,
          pendingOperation,
        });

        const receipt = await waitForTransactionReceipt(client, {
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
      client,
      connectedAddress,
      likeReactionSubmission,
      postCommentMutation,
      switchChainAsync,
    ],
  );
};
