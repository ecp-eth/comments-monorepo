import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { bigintReplacer, cn } from "@/lib/utils";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, SignTypedDataParameters } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import type { Comment as CommentType } from "@/lib/schemas";
import { useFreshRef } from "@/hooks/useFreshRef";
import {
  CommentPageSchema,
  DeleteCommentResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedSchemaType,
} from "@/lib/schemas";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { publicEnv } from "@/publicEnv";
import { CommentAuthor } from "../CommentAuthor";
import { CommentText } from "../CommentText";
import { CommentActionOrStatus } from "../CommentActionOrStatus";
import { MAX_INITIAL_REPLIES_ON_PARENT_COMMENT } from "@/lib/constants";
import { fetchCommentReplies } from "@ecp.eth/sdk";
import { CommentActionButton } from "../CommentActionButton";
import {
  deletePriorApprovedCommentMutationFunction,
  deletePriorNotApprovedCommentMutationFunction,
} from "../queries";
import {
  useHandleCommentDeleted,
  useHandleCommentPostedSuccessfully,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
  useSubmitGaslessComment,
} from "../hooks";
import type {
  OnDeleteComment,
  OnPostCommentSuccess,
  OnRetryPostComment,
} from "../types";
import { toast } from "sonner";
import never from "never";

interface CommentProps {
  isAppSignerApproved: boolean;
  comment: CommentType;
  onDelete?: OnDeleteComment;
  /**
   * Called when comment is successfully posted to the blockchain.
   *
   * This is called only if comment is pending.
   */
  onPostSuccess: OnPostCommentSuccess;
  /**
   * Called when comment posting to blockchain failed and the transaction has been reverted
   * and user pressed retry.
   */
  onRetryPost: OnRetryPostComment;
  level?: number;
}

export function CommentGasless({
  comment,
  onPostSuccess,
  onRetryPost,
  onDelete,
  isAppSignerApproved: submitIfApproved,
  level = 0,
}: CommentProps) {
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);
  const onPostSuccessRef = useFreshRef(onPostSuccess);
  const onDeleteRef = useFreshRef(onDelete);
  /**
   * Prevents infinite cycle when delete comment transaction succeeded
   * because comment is updated to be redacted
   */
  const commentRef = useFreshRef(comment);
  const areRepliesAllowed = level < publicEnv.NEXT_PUBLIC_REPLY_DEPTH_CUTOFF;
  const queryKey = useMemo(() => ["comments", comment.id], [comment.id]);
  const submitTargetCommentId = areRepliesAllowed
    ? comment.id
    : (comment.parentId ?? never("parentId is required for comment depth > 0"));
  const submitTargetQueryKey = useMemo(
    () => ["comments", submitTargetCommentId],
    [submitTargetCommentId]
  );

  const repliesQuery = useInfiniteQuery({
    enabled: areRepliesAllowed,
    queryKey,
    initialData: comment.replies
      ? {
          pages: [comment.replies],
          pageParams: [
            {
              cursor: comment.replies.pagination.endCursor,
              limit: comment.replies.pagination.limit,
            },
          ],
        }
      : undefined,
    initialPageParam: {
      cursor: comment.replies?.pagination.endCursor,
      limit:
        comment.replies?.pagination.limit ??
        MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchCommentReplies({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        cursor: pageParam.cursor,
        limit: pageParam.limit,
        commentId: comment.id,
        signal,
      });

      return CommentPageSchema.parse(response);
    },
    getNextPageParam(lastPage) {
      if (!lastPage.pagination.hasNext) {
        return;
      }

      return {
        cursor: lastPage.pagination.endCursor,
        limit: lastPage.pagination.limit,
      };
    },
  });

  const handleCommentSubmitted = useHandleCommentSubmitted({
    queryKey: submitTargetQueryKey,
  });
  const handleCommentPostedSuccessfully = useHandleCommentPostedSuccessfully({
    queryKey: submitTargetQueryKey,
  });
  const handleRetryPostComment = useHandleRetryPostComment({
    queryKey: submitTargetQueryKey,
  });
  const handleCommentDeleted = useHandleCommentDeleted({ queryKey });

  const submitCommentMutation = useSubmitGaslessComment();

  const retryPostMutation = useMutation({
    mutationFn: async () => {
      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type === "nongasless") {
        throw new Error("Only gasless comments can be retried");
      }

      return submitCommentMutation.mutateAsync({
        content: comment.pendingOperation.response.data.content,
        isApproved: comment.pendingOperation.type === "gasless-preapproved",
        targetUri: comment.pendingOperation.response.data.targetUri,
        parentId: comment.pendingOperation.response.data.parentId,
      });
    },
    onSuccess(newPendingOperation) {
      onRetryPost(comment, newPendingOperation);
    },
  });

  // delete a comment that was previously approved, so not need for
  // user approval for signature for each interaction
  const deletePriorApprovedCommentMutation = useMutation({
    mutationFn: async () => {
      if (!connectedAddress) {
        throw new Error("No address found");
      }

      if (!submitIfApproved) {
        throw new Error("Not approved");
      }

      const result = await deletePriorApprovedCommentMutationFunction({
        address: connectedAddress,
        commentId: comment.id,
      });

      return result.txHash;
    },
  });

  // delete a comment that was previously NOT approved,
  // will require user interaction for signature
  const deletePriorNotApprovedCommentMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      if (!connectedAddress) {
        throw new Error("No address found");
      }

      const data = await deletePriorNotApprovedCommentMutationFunction({
        address: connectedAddress,
        commentId: comment.id,
      });

      return {
        signTypedDataParams:
          data.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: data,
      } satisfies {
        signTypedDataParams: SignTypedDataParameters;
        variables: PreparedSignedGaslessDeleteCommentNotApprovedSchemaType;
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/delete-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            ...variables,
            authorSignature: signature,
          },
          bigintReplacer // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        throw new Error("Failed to post approval signature");
      }

      const data = DeleteCommentResponseSchema.parse(await response.json());

      return data.txHash;
    },
  });

  const handleDeleteClick = useCallback(() => {
    if (submitIfApproved) {
      deletePriorApprovedCommentMutation.mutate();
    } else {
      deletePriorNotApprovedCommentMutation.mutate();
    }
  }, [
    submitIfApproved,
    deletePriorApprovedCommentMutation,
    deletePriorNotApprovedCommentMutation,
  ]);

  const deleteCommentTransactionReceipt = useWaitForTransactionReceipt({
    hash:
      deletePriorNotApprovedCommentMutation.data ||
      deletePriorApprovedCommentMutation.data,
  });

  useEffect(() => {
    if (deleteCommentTransactionReceipt.data?.status === "success") {
      onDeleteRef.current?.(commentRef.current.id);
    }
  }, [deleteCommentTransactionReceipt.data?.status, commentRef, onDeleteRef]);

  const postingCommentTxReceipt = useWaitForTransactionReceipt({
    hash: comment.pendingOperation?.txHash,
    chainId: comment.pendingOperation?.chainId,
  });

  useEffect(() => {
    if (postingCommentTxReceipt.data?.status === "success") {
      onPostSuccessRef.current?.(postingCommentTxReceipt.data.transactionHash);
      toast.success("Comment posted");
    }
  }, [onPostSuccessRef, postingCommentTxReceipt.data]);

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

  const isDeleting =
    deletePriorNotApprovedCommentMutation.isPending ||
    deletePriorApprovedCommentMutation.isPending ||
    deleteCommentTransactionReceipt.isFetching;
  const didDeletingFailed =
    !isDeleting &&
    (deletePriorApprovedCommentMutation.isError ||
      deletePriorNotApprovedCommentMutation.isError);

  const isPosting = postingCommentTxReceipt.isFetching;
  const didPostingFailed =
    !isPosting && postingCommentTxReceipt.data?.status === "reverted";

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <CommentAuthor author={comment.author} timestamp={comment.timestamp} />
        {isAuthor && !comment.deletedAt && !comment.pendingOperation && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={handleDeleteClick}
                disabled={isDeleting}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div
        className={cn(
          "mb-2 break-all text-foreground",
          comment.deletedAt && "text-muted-foreground"
        )}
      >
        <CommentText text={comment.content} />
      </div>
      <div className="mb-2">
        <CommentActionOrStatus
          comment={comment}
          hasAccountConnected={!!connectedAddress}
          hasRepliesAllowed={areRepliesAllowed}
          isDeleting={isDeleting}
          isPosting={isPosting}
          deletingFailed={didDeletingFailed}
          postingFailed={didPostingFailed}
          onRetryDeleteClick={handleDeleteClick}
          onReplyClick={() => setIsReplying((prev) => !prev)}
          onRetryPostClick={retryPostMutation.mutate}
        />
      </div>
      {isReplying && (
        <CommentBoxGasless
          onLeftEmpty={() => setIsReplying(false)}
          onSubmitSuccess={(pendingOperation) => {
            setIsReplying(false);
            handleCommentSubmitted(pendingOperation);
          }}
          placeholder="What are your thoughts?"
          parentId={
            level >= publicEnv.NEXT_PUBLIC_REPLY_DEPTH_CUTOFF &&
            comment.parentId
              ? comment.parentId
              : comment.id
          }
          isAppSignerApproved={submitIfApproved}
        />
      )}
      {replies.map((reply) => (
        <CommentGasless
          key={reply.id}
          comment={reply}
          onDelete={handleCommentDeleted}
          onPostSuccess={handleCommentPostedSuccessfully}
          onRetryPost={handleRetryPostComment}
          isAppSignerApproved={submitIfApproved}
          level={level + 1}
        />
      ))}
      {repliesQuery.hasNextPage && (
        <div className="mb-2">
          <CommentActionButton onClick={() => repliesQuery.fetchNextPage()}>
            show more replies
          </CommentActionButton>
        </div>
      )}
    </div>
  );
}
