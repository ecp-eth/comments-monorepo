"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CommentForm, OnSubmitSuccessFunction } from "./CommentForm";
import { formatDate } from "@/lib/utils";
import {
  Loader2Icon,
  MessageCircleWarningIcon,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { getAddress } from "viem";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import {
  CommentPageSchema,
  PendingCommentOperationSchemaType,
  type Comment as CommentType,
} from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useFreshRef } from "@/hooks/useFreshRef";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { blo } from "blo";
import { toast } from "sonner";
import {
  deletePendingCommentByTransactionHash,
  insertPendingCommentToPage,
  replaceCommentPendingOperationByComment,
} from "./helpers";
import { submitCommentMutationFunction } from "./queries";

const REPLIES_PER_PAGE = 10;

export type OnDeleteComment = (id: Hex) => void;
export type OnPostCommentSuccess = (transactionHash: Hex) => void;
export type OnRetryPostComment = (
  comment: CommentType,
  newPendingOperation: PendingCommentOperationSchemaType
) => void;

interface CommentProps {
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
}

export function Comment({
  comment,
  onDelete,
  onPostSuccess,
  onRetryPost,
}: CommentProps) {
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const onPostSuccessRef = useFreshRef(onPostSuccess);
  const onDeleteRef = useFreshRef(onDelete);
  /**
   * Prevents infinite cycle when delete comment transaction succeeded
   * because comment is updated to be redacted
   */
  const commentRef = useFreshRef(comment);
  const client = useQueryClient();
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);
  const queryKey = useMemo(() => ["comments", comment.id], [comment.id]);

  const repliesQuery = useInfiniteQuery({
    queryKey,
    initialData: {
      pages: [comment.replies],
      pageParams: [
        {
          offset: comment.replies.pagination.offset,
          limit: comment.replies.pagination.limit,
        },
      ],
    },
    initialPageParam: {
      offset: comment.replies.pagination.offset,
      limit: comment.replies.pagination.limit,
    },
    staleTime: 5000, // do not load the data on first mount
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam, signal }) => {
      const searchParams = new URLSearchParams({
        offset: pageParam.offset.toString(),
        limit: REPLIES_PER_PAGE.toString(),
      });

      const response = await fetch(
        `/api/comments/${comment.id}/replies?${searchParams.toString()}`,
        {
          signal,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      return CommentPageSchema.parse(await response.json());
    },
    getNextPageParam(lastPage) {
      if (!lastPage.pagination.hasMore) {
        return;
      }

      return {
        offset: lastPage.pagination.offset + lastPage.pagination.limit,
        limit: lastPage.pagination.limit,
      };
    },
  });

  type RepliesQueryData = typeof repliesQuery.data;

  const replies = useMemo(() => {
    return repliesQuery.data.pages.flatMap((page) => page.results);
  }, [repliesQuery.data.pages]);

  const handleCommentSubmitted = useCallback<OnSubmitSuccessFunction>(
    (pendingData) => {
      setIsReplying(false);

      client.setQueryData<RepliesQueryData>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return insertPendingCommentToPage(oldData, pendingData);
      });
    },
    [client, queryKey]
  );

  const handleCommentPostedSuccessfully = useCallback<OnPostCommentSuccess>(
    (transactionHash: Hex) => {
      client.setQueryData<RepliesQueryData>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return deletePendingCommentByTransactionHash(oldData, transactionHash);
      });
    },
    [queryKey, client]
  );

  const handleRetryPostComment = useCallback<OnRetryPostComment>(
    (comment, newPendingOperation) => {
      client.setQueryData<RepliesQueryData>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return replaceCommentPendingOperationByComment(
          oldData,
          comment,
          newPendingOperation
        );
      });
    },
    [queryKey, client]
  );

  const retryPostMutation = useMutation({
    mutationFn: async (e: React.MouseEvent) => {
      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      return submitCommentMutationFunction({
        address,
        commentRequest: {
          chainId: comment.pendingOperation.chainId,
          content: comment.pendingOperation.response.data.content,
          parentId: comment.pendingOperation.response.data.parentId,
          targetUri: comment.pendingOperation.response.data.targetUri,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        writeContractAsync(params) {
          return writeContractAsync({
            abi: CommentsV1Abi,
            address: COMMENTS_V1_ADDRESS,
            functionName: "postCommentAsAuthor",
            args: [params.data, params.signature],
          });
        },
      });
    },
    onSuccess(newPendingOperation) {
      onRetryPost(comment, newPendingOperation);
    },
  });

  const deleteCommentContract = useWriteContract();

  const deleteCommentTransactionReceipt = useWaitForTransactionReceipt({
    hash: deleteCommentContract.data,
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
      toast("Comment posted");
    }
  }, [onPostSuccessRef, postingCommentTxReceipt.data]);

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const isDeleting =
    deleteCommentTransactionReceipt.isFetching ||
    deleteCommentContract.isPending;

  const isPosting = postingCommentTxReceipt.isFetching;
  const didPostingFailed =
    !isPosting && postingCommentTxReceipt.data?.status === "reverted";

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {comment.author?.ens?.avatarUrl ? (
              <AvatarImage
                src={comment.author.ens.avatarUrl}
                alt="ENS Avatar"
              />
            ) : comment.author ? (
              <AvatarImage
                src={blo(comment.author?.address)}
                alt="Generated Avatar"
              />
            ) : null}
            <AvatarFallback>
              {comment.author?.ens?.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs text-gray-500">
            {comment.author?.ens?.name ??
              comment.author?.address ??
              "Unknown sender"}{" "}
            • {formatDate(comment.timestamp)}
          </div>
        </div>
        {isAuthor && !comment.pendingOperation && !comment.deletedAt && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => {
                  deleteCommentContract.writeContract({
                    address: COMMENTS_V1_ADDRESS,
                    abi: CommentsV1Abi,
                    functionName: "deleteCommentAsAuthor",
                    args: [comment.id],
                  });
                }}
                disabled={isDeleting}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mb-2">{comment.content}</div>
      <div className="text-xs text-gray-500 mb-2">
        {!comment.pendingOperation && (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="hover:underline"
          >
            reply
          </button>
        )}
        {isPosting && (
          <div className="flex items-center gap-1">
            <Loader2Icon className="w-3 h-3 animate-spin" />
            <span>Posting...</span>
          </div>
        )}
        {didPostingFailed && (
          <div className="flex items-center gap-1 text-red-500">
            <MessageCircleWarningIcon className="w-3 h-3" />
            <span>
              Could not post the comment.{" "}
              <button
                className="font-semibold hover:underline"
                onClick={retryPostMutation.mutate}
              >
                Retry
              </button>
            </span>
          </div>
        )}
      </div>
      {isReplying && (
        <div className="mb-2">
          <CommentForm
            onLeftEmpty={() => setIsReplying(false)}
            onSubmitSuccess={handleCommentSubmitted}
            placeholder="What are your thoughts?"
            parentId={comment.id}
          />
        </div>
      )}
      {replies.map((reply) => (
        <Comment
          key={reply.id}
          comment={reply}
          onDelete={onDelete}
          onPostSuccess={handleCommentPostedSuccessfully}
          onRetryPost={handleRetryPostComment}
        />
      ))}
      {repliesQuery.hasNextPage && (
        <div className="text-xs text-gray-500 mb-2">
          <button
            onClick={() => repliesQuery.fetchNextPage()}
            className="mr-2 hover:underline"
          >
            show more replies
          </button>
        </div>
      )}
    </div>
  );
}
