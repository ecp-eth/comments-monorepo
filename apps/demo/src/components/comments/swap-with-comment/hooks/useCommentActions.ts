import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
} from "../../core/CommentActionsContext";
import { concat, type Hex, encodeFunctionData, numberToHex, size } from "viem";
import {
  useSwitchChain,
  useSignTypedData,
  useConfig,
  useSendCalls,
} from "wagmi";
import { waitForCallsStatus, waitForTransactionReceipt } from "@wagmi/core";
import {
  useCommentDeletion,
  useCommentSubmission,
} from "@ecp.eth/shared/hooks";
import { submitCommentMutationFunction } from "../../standard/queries";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import type { QuoteResponseLiquidityAvailableSchemaType } from "../0x/schemas";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { useDeleteComment } from "@ecp.eth/sdk/comments/react";
import { useCommentActions as useStandardCommentActions } from "../../standard/hooks/useCommentActions";
import { COMMENT_MANAGER_ADDRESS, CommentManagerABI } from "@ecp.eth/sdk";
import { bigintReplacer } from "@ecp.eth/shared/helpers";

export type SwapWithCommentExtra = {
  quote: QuoteResponseLiquidityAvailableSchemaType;
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

  const { mutateAsync: deleteCommentAsAuthor } = useDeleteComment();
  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        const { txHash } = await deleteCommentAsAuthor({
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
    [wagmiConfig, commentDeletion, deleteCommentAsAuthor],
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
        throw new Error("Missing extra data");
      }

      const { quote } = params.extra;

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

      const pendingOperation = await submitCommentMutationFunction({
        address: params.address,
        zeroExSwap: {
          from: {
            amount: quote.sellAmount,
            address: quote.sellToken,
            symbol: "",
          },
          to: {
            amount: quote.buyAmount,
            address: quote.buyToken,
            symbol: "",
          },
        },
        commentRequest: {
          content: comment.content,
          metadata: JSON.stringify(
            {
              swap: true,
              provider: "0x",
              from: quote.sellToken,
              fromAmount: quote.sellAmount.toString(),
              to: quote.buyToken,
              toAmount: quote.buyAmount.toString(),
            },
            bigintReplacer,
          ),
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
      signTypedDataAsync,
      switchChainAsync,
      sendCallsAsync,
      commentSubmission,
      wagmiConfig,
    ],
  );

  return useMemo(
    () => ({
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
    }),
    [
      deleteComment,
      retryPostComment,
      postComment,
      editComment,
      retryEditComment,
    ],
  );
}
