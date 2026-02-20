import { useCallback } from "react";
import { useAccount, useConfig, usePublicClient, useSwitchChain } from "wagmi";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import { getCommentCursor } from "@ecp.eth/sdk/indexer";
import { getModerationStatus, isSameHex } from "@ecp.eth/shared/helpers";
import {
  type Comment,
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
  type PendingPostCommentOperationSchemaType,
  type Reaction,
} from "@ecp.eth/shared/schemas";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { submitPostComment } from "../queries/postComment";
import { useEmbedConfig } from "@/components/EmbedConfigProvider";
import { getWalletClient, waitForTransactionReceipt } from "@wagmi/core";

type UseReactCommentProps = {
  /**
   * Comment to react to.
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

export const useReactComment = () => {
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const { address: connectedAddress } = useAccount();
  const { channelId, gasSponsorship } = useEmbedConfig();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  return useCallback(
    async (params: UseReactCommentProps) => {
      if (!publicClient) {
        throw new Error(
          "No wagmi client found, this component must be used within a wagmi provider",
        );
      }

      if (!connectedAddress) {
        throw new Error("Wallet not connected");
      }

      const walletClient = await getWalletClient(wagmiConfig);
      const {
        comment,
        queryKey,
        reactionType,
        onBeforeStart,
        onFailed,
        onSuccess,
      } = params;
      const normalizedReactionType = reactionType.trim();

      if (!normalizedReactionType) {
        throw new Error("Reaction type is required");
      }

      if (
        (comment.viewerReactions?.[normalizedReactionType]?.length ?? 0) > 0
      ) {
        throw new Error("Comment already reacted");
      }

      onBeforeStart?.();
      let optimisticPendingOperation:
        | PendingPostCommentOperationSchemaType
        | undefined;

      try {
        const pendingOperation = {
          ...(await submitPostComment({
            requestPayload: {
              author: connectedAddress,
              content: normalizedReactionType,
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
            gasSponsorship,
          })),
          references: [],
        };
        optimisticPendingOperation = pendingOperation;

        queryClient.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
          queryKey,
          (data) => {
            if (!data) {
              return data;
            }

            const queryData = ListCommentsQueryDataSchema.parse(data);
            return insertPendingReactionToQuery(
              queryData,
              pendingOperation,
              normalizedReactionType,
            );
          },
        );

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        onSuccess?.();
        await queryClient.invalidateQueries({ queryKey });
      } catch (e) {
        if (optimisticPendingOperation) {
          const failedPendingOperation = optimisticPendingOperation;
          queryClient.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
            queryKey,
            (data) => {
              if (!data) {
                return data;
              }

              const queryData = ListCommentsQueryDataSchema.parse(data);
              return revertPendingReactionInQuery(
                queryData,
                failedPendingOperation,
                normalizedReactionType,
              );
            },
          );
        }

        onFailed?.(e);
        throw e;
      }
    },
    [
      channelId,
      connectedAddress,
      gasSponsorship,
      publicClient,
      queryClient,
      switchChainAsync,
      wagmiConfig,
    ],
  );
};

function insertPendingReactionToQuery(
  queryData: ListCommentsQueryDataSchemaType,
  pendingOperation: PendingPostCommentOperationSchemaType,
  reactionType: string,
): ListCommentsQueryDataSchemaType {
  if (!queryData.pages[0]) {
    return queryData;
  }

  const parentId = pendingOperation.response.data.parentId;

  const reaction: Reaction = {
    ...pendingOperation.response.data,
    author: pendingOperation.resolvedAuthor ?? {
      address: pendingOperation.response.data.author,
    },
    cursor: getCommentCursor(pendingOperation.response.data.id, new Date()),
    deletedAt: null,
    logIndex: 0,
    txHash: pendingOperation.txHash,
    chainId: pendingOperation.chainId,
    createdAt: new Date(),
    updatedAt: new Date(),
    revision: 0,
    metadata: [],
    hookMetadata: [],
    moderationStatus: getModerationStatus(
      queryData.pages[0].extra,
      pendingOperation.response.data,
    ),
    moderationStatusChangedAt: new Date(),
    moderationClassifierResult: {},
    moderationClassifierScore: 0,
    zeroExSwap: pendingOperation.zeroExSwap ?? null,
    references: [],
    path: `${pendingOperation.response.data.author.toLowerCase()}/${pendingOperation.response.data.id.toLowerCase()}`,
    reactionCounts: {},
    viewerReactions: {},
    replies: {
      extra: {
        moderationEnabled: false,
        moderationKnownReactions: [],
      },
      results: [],
      pagination: {
        hasNext: false,
        hasPrevious: false,
        count: 0,
        limit: 1,
      },
    },
  };

  return {
    ...queryData,
    pages: queryData.pages.map((page) => ({
      ...page,
      results: page.results.map((result) => {
        if (!isSameHex(result.id, parentId)) {
          return result;
        }

        const viewerReactions = { ...(result.viewerReactions ?? {}) };
        viewerReactions[reactionType] = [reaction];

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

function revertPendingReactionInQuery(
  queryData: ListCommentsQueryDataSchemaType,
  pendingOperation: PendingPostCommentOperationSchemaType,
  reactionType: string,
): ListCommentsQueryDataSchemaType {
  const parentId = pendingOperation.response.data.parentId;
  const reactionId = pendingOperation.response.data.id;

  return {
    ...queryData,
    pages: queryData.pages.map((page) => ({
      ...page,
      results: page.results.map((result) => {
        if (!isSameHex(result.id, parentId)) {
          return result;
        }

        if (!result.reactionCounts || !result.viewerReactions) {
          return result;
        }

        const reactionCounts = { ...result.reactionCounts };
        reactionCounts[reactionType] = Math.max(
          0,
          (reactionCounts[reactionType] ?? 0) - 1,
        );

        const viewerReactions = { ...result.viewerReactions };
        viewerReactions[reactionType] =
          viewerReactions[reactionType]?.filter(
            (reaction) => !isSameHex(reaction.id, reactionId),
          ) ?? [];

        return {
          ...result,
          reactionCounts,
          viewerReactions,
        };
      }),
    })),
  };
}
