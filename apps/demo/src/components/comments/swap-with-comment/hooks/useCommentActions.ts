import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnLikeComment,
  OnPostComment,
  OnRetryPostComment,
  OnUnlikeComment,
} from "../../core/CommentActionsContext";
import { concat, type Hex, encodeFunctionData, numberToHex, size } from "viem";
import {
  useSwitchChain,
  useSignTypedData,
  useConfig,
  useSendCalls,
} from "wagmi";
import {
  getCapabilities,
  getChainId,
  waitForCallsStatus,
  waitForTransactionReceipt,
} from "@wagmi/core";
import {
  useCommentDeletion,
  useCommentSubmission,
  useReactionRemoval,
  useReactionSubmission,
} from "@ecp.eth/shared/hooks";
import { submitCommentMutationFunction } from "../../standard/queries";
import type {
  PendingDeleteCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import {
  COMMENT_REACTION_LIKE_CONTENT,
  TX_RECEIPT_TIMEOUT,
} from "@/lib/constants";
import { useDeleteComment } from "@ecp.eth/sdk/comments/react";
import { useCommentActions as useStandardCommentActions } from "../../standard/hooks/useCommentActions";
import {
  COMMENT_MANAGER_ADDRESS,
  COMMENT_TYPE_REACTION,
  CommentManagerABI,
} from "@ecp.eth/sdk";
import type { QuoteViewState } from "../0x/QuoteView";
import type { IndexerAPICommentZeroExSwapSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { createMetadataEntry } from "@ecp.eth/sdk/comments/metadata";

export type SwapWithCommentExtra = {
  quoteViewState: QuoteViewState;
};

type UseCommentActionsProps = {
  connectedAddress: Hex | undefined;
};

export function useCommentActions({
  connectedAddress,
}: UseCommentActionsProps): CommentActionsContextType<SwapWithCommentExtra> {
  const { editComment, retryEditComment } = useStandardCommentActions({
    connectedAddress,
  });
  const wagmiConfig = useConfig();
  const { sendCallsAsync } = useSendCalls();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const commentDeletion = useCommentDeletion();
  const commentSubmission = useCommentSubmission();
  const { mutateAsync: deleteCommentMutation } = useDeleteComment();
  const likeReactionSubmission = useReactionSubmission(
    COMMENT_REACTION_LIKE_CONTENT,
  );
  const likeReactionRemoval = useReactionRemoval(COMMENT_REACTION_LIKE_CONTENT);

  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        const { txHash } = await deleteCommentMutation({
          commentId: params.comment.id,
        });

        const pendingOperation: PendingDeleteCommentOperationSchemaType = {
          action: "delete",
          chainId: params.comment.chainId,
          commentId: params.comment.id,
          state: { status: "pending" },
          type: "non-gasless",
          txHash,
        };

        commentDeletion.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentDeletion.success({
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentDeletion.error({
          commentId: params.comment.id,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [wagmiConfig, commentDeletion, deleteCommentMutation],
  );

  const retryPostComment = useCallback<OnRetryPostComment>(async () => {
    throw new Error(
      "Retrying post with swapping is not possible at the moment.",
    );
  }, []);

  const postComment = useCallback<OnPostComment<SwapWithCommentExtra>>(
    async (params) => {
      const { comment } = params;

      if (!params.extra) {
        throw new Error(
          "Missing swap information. Make sure to first finalize the swap.",
        );
      }

      const chainId = await getChainId(wagmiConfig);
      const capabilities = await getCapabilities(wagmiConfig);

      if (
        capabilities[chainId]?.atomic?.status !== "supported" &&
        capabilities[chainId]?.atomic?.status !== "ready"
      ) {
        throw new Error(
          "Atomic transactions are not supported by your wallet on this chain.",
        );
      }

      const { quoteViewState } = params.extra;

      const { quote, price } = quoteViewState;

      // (1) Sign the Permit2 EIP-712 message returned from quote
      const signature = await signTypedDataAsync(quote.permit2.eip712);

      // (2) Append signature length and signature data to calldata
      const signatureLengthInHex = numberToHex(size(signature), {
        signed: false,
        size: 32,
      });

      const transactionData = quote.transaction.data;
      const sigLengthHex = signatureLengthInHex;
      const sig = signature;

      const zeroExSwap: IndexerAPICommentZeroExSwapSchemaType = {
        from: {
          amount: price.from.amount,
          address: quote.sellToken,
          symbol: price.from.token.symbol,
        },
        to: {
          amount: price.to.amount,
          address: quote.buyToken,
          symbol: price.to.token.symbol,
        },
      };

      const pendingOperation = await submitCommentMutationFunction({
        author: connectedAddress,
        zeroExSwap,
        references: comment.references,
        commentRequest: {
          content: comment.content,
          metadata: [
            createMetadataEntry(
              "swap",
              "string",
              JSON.stringify({
                swap: true,
                provider: "0x",
                data: zeroExSwap,
              }),
            ),
          ],
          ...("parentId" in comment
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
        async writeContractAsync({ signCommentResponse }) {
          const { id } = await sendCallsAsync({
            calls: [
              {
                to: COMMENT_MANAGER_ADDRESS,
                data: encodeFunctionData({
                  abi: CommentManagerABI,
                  functionName: "postComment",
                  args: [
                    signCommentResponse.data,
                    signCommentResponse.signature,
                  ],
                }),
              },
              {
                to: quote.transaction.to,
                data: concat([transactionData, sigLengthHex, sig]),
                value: quote.transaction.value,
              },
            ],
            forceAtomic: true,
          });

          return id as Hex;
        },
      });

      try {
        commentSubmission.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForCallsStatus(wagmiConfig, {
          id: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentSubmission.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentSubmission.error({
          commentId: pendingOperation.response.data.id,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      wagmiConfig,
      signTypedDataAsync,
      connectedAddress,
      switchChainAsync,
      sendCallsAsync,
      commentSubmission,
    ],
  );

  const likeComment = useCallback<OnLikeComment>(
    async (params) => {
      const { comment, queryKey, onBeforeStart, onFailed, onSuccess } = params;

      onBeforeStart?.();

      let pendingOperation: PendingPostCommentOperationSchemaType | undefined =
        undefined;

      try {
        pendingOperation = await submitCommentMutationFunction({
          author: connectedAddress,
          zeroExSwap: null,
          commentRequest: {
            content: COMMENT_REACTION_LIKE_CONTENT,
            metadata: [],
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
    [likeReactionSubmission, connectedAddress, switchChainAsync, wagmiConfig],
  );

  const unlikeComment = useCallback<OnUnlikeComment>(
    async (params) => {
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

        const { txHash } = await deleteCommentMutation({
          commentId: reaction.id,
        });

        // Optimistically remove the reaction from the UI
        likeReactionRemoval.start(reactionRemovalParams);

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
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
    [likeReactionRemoval, deleteCommentMutation, wagmiConfig],
  );

  return useMemo(
    () => ({
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
      likeComment,
      unlikeComment,
    }),
    [
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
      likeComment,
      unlikeComment,
    ],
  );
}

function postCommentMutation(arg0: {
  appSignature: `0x${string}`;
  comment: {
    author: `0x${string}`;
    targetUri: string;
    app: `0x${string}`;
    channelId: bigint;
    commentType: number;
    id: `0x${string}`;
    content: string;
    metadata: { value: `0x${string}`; key: `0x${string}` }[];
    parentId: `0x${string}`;
    deadline: bigint;
  };
}): { txHash: any } | PromiseLike<{ txHash: any }> {
  throw new Error("Function not implemented.");
}
