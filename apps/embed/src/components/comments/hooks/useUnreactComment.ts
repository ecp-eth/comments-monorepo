import { useCallback, useRef } from "react";
import { waitForTransactionReceipt } from "viem/actions";
import { useAccount, useConnectorClient, useSwitchChain } from "wagmi";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { isSameHex } from "@ecp.eth/shared/helpers";
import {
  type Comment,
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
  type Reaction,
} from "@ecp.eth/shared/schemas";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { submitDeleteComment } from "../queries/deleteComment";
import { useEmbedConfig } from "@/components/EmbedConfigProvider";
import { useReadWriteContractAsync } from "@/hooks/useReadWriteContractAsync";
import type { Hex } from "viem";

type UseUnreactCommentProps = {
  /**
   * Parent comment to remove reaction from.
   */
  comment: Comment;
  /**
   * Query key where the target comment is cached.
   */
  queryKey: QueryKey;
  /**
   * Reaction content value.
   */
  reactionType: string;
  /**
   * Called before transaction was created.
   */
  onBeforeStart?: () => void;
  /**
   * Called when transaction was successful.
   */
  onSuccess?: () => void;
  /**
   * Called when transaction failed.
   */
  onFailed?: (error: unknown) => void;
};

export const useUnreactComment = () => {
  const { address: viewer } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: client } = useConnectorClient();
  const config = useEmbedConfig();
  const { writeContractAsync, signTypedDataAsync } =
    useReadWriteContractAsync();
  const queryClient = useQueryClient();
  const removedReactions = useRef<Map<Hex, Reaction>>(new Map());

  return useCallback(
    async (params: UseUnreactCommentProps) => {
      if (!client) {
        throw new Error("No client");
      }

      if (!viewer) {
        throw new Error("Wallet not connected");
      }

      const {
        comment,
        queryKey,
        reactionType,
        onBeforeStart,
        onSuccess,
        onFailed,
      } = params;
      const normalizedReactionType = reactionType.trim();

      if (!normalizedReactionType) {
        throw new Error("Reaction type is required");
      }

      const reactions = comment.viewerReactions?.[normalizedReactionType] ?? [];
      const reaction = reactions[reactions.length - 1];

      if (!reaction) {
        throw new Error("Reaction not found");
      }

      try {
        onBeforeStart?.();
        queryClient.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
          queryKey,
          (data) => {
            if (!data) {
              return data;
            }

            const queryData = ListCommentsQueryDataSchema.parse(data);
            return removeReactionFromQuery({
              queryData,
              reactionId: reaction.id,
              parentCommentId: comment.id,
              reactionType: normalizedReactionType,
              removedReactions: removedReactions.current,
            });
          },
        );

        const { txHash } = await submitDeleteComment({
          requestPayload: {
            author: viewer,
            commentId: reaction.id,
            chainId: reaction.chainId,
          },
          switchChainAsync: async (chainId: number) => {
            const result = await switchChainAsync({ chainId });
            return result;
          },
          writeContractAsync,
          signTypedDataAsync,
          gasSponsorship: config.gasSponsorship,
        });

        const receipt = await waitForTransactionReceipt(client, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        removedReactions.current.delete(reaction.id);
        onSuccess?.();
        await queryClient.invalidateQueries({ queryKey });
      } catch (e) {
        queryClient.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
          queryKey,
          (data) => {
            if (!data) {
              return data;
            }

            const queryData = ListCommentsQueryDataSchema.parse(data);
            return restoreRemovedReactionInQuery({
              queryData,
              reactionId: reaction.id,
              parentCommentId: comment.id,
              reactionType: normalizedReactionType,
              removedReactions: removedReactions.current,
            });
          },
        );

        onFailed?.(e);
        throw e;
      }
    },
    [
      client,
      config.chainId,
      config.gasSponsorship,
      queryClient,
      removedReactions,
      signTypedDataAsync,
      switchChainAsync,
      viewer,
      writeContractAsync,
    ],
  );
};

function removeReactionFromQuery(params: {
  queryData: ListCommentsQueryDataSchemaType;
  reactionId: Hex;
  parentCommentId: Hex;
  reactionType: string;
  removedReactions: Map<Hex, Reaction>;
}): ListCommentsQueryDataSchemaType {
  const {
    queryData,
    reactionId,
    parentCommentId,
    reactionType,
    removedReactions,
  } = params;

  const parentComment = queryData.pages
    .flatMap((page) => page.results)
    .find((result) => isSameHex(result.id, parentCommentId));

  if (!parentComment) {
    return queryData;
  }

  const reactionToRemove = parentComment.viewerReactions?.[reactionType]?.find(
    (reaction) => isSameHex(reaction.id, reactionId),
  );

  if (!reactionToRemove) {
    return queryData;
  }

  removedReactions.set(reactionId, reactionToRemove);

  return {
    ...queryData,
    pages: queryData.pages.map((page) => ({
      ...page,
      results: page.results.map((result) => {
        if (!isSameHex(result.id, parentCommentId)) {
          return result;
        }

        const viewerReactions = { ...(result.viewerReactions ?? {}) };
        if (viewerReactions[reactionType]) {
          viewerReactions[reactionType] = viewerReactions[reactionType].filter(
            (reaction) => !isSameHex(reaction.id, reactionId),
          );
        }

        const reactionCounts = { ...(result.reactionCounts ?? {}) };
        if (reactionCounts[reactionType] !== undefined) {
          reactionCounts[reactionType] = Math.max(
            0,
            (reactionCounts[reactionType] ?? 0) - 1,
          );
        }

        return {
          ...result,
          viewerReactions,
          reactionCounts,
        };
      }),
    })),
  };
}

function restoreRemovedReactionInQuery(params: {
  queryData: ListCommentsQueryDataSchemaType;
  reactionId: Hex;
  parentCommentId: Hex;
  reactionType: string;
  removedReactions: Map<Hex, Reaction>;
}): ListCommentsQueryDataSchemaType {
  const {
    queryData,
    reactionId,
    parentCommentId,
    reactionType,
    removedReactions,
  } = params;

  const removedReaction = removedReactions.get(reactionId);
  if (!removedReaction) {
    return queryData;
  }

  removedReactions.delete(reactionId);

  return {
    ...queryData,
    pages: queryData.pages.map((page) => ({
      ...page,
      results: page.results.map((result) => {
        if (!isSameHex(result.id, parentCommentId)) {
          return result;
        }

        const viewerReactions = { ...(result.viewerReactions ?? {}) };
        viewerReactions[reactionType] = [
          ...(viewerReactions[reactionType] ?? []),
          removedReaction,
        ];

        const reactionCounts = { ...(result.reactionCounts ?? {}) };
        reactionCounts[reactionType] = (reactionCounts[reactionType] ?? 0) + 1;

        return {
          ...result,
          viewerReactions,
          reactionCounts,
        };
      }),
    })),
  };
}
