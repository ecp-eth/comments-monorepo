"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CommentForm } from "./CommentForm";
import { cn, formatDate } from "@/lib/utils";
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
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { blo } from "blo";
import { toast } from "sonner";
import { submitCommentMutationFunction } from "./queries";
import {
  useHandleCommentDeleted,
  useHandleCommentPostedSuccessfully,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
} from "./hooks";
import { Button } from "../ui/button";

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

  const replies = useMemo(() => {
    return repliesQuery.data.pages.flatMap((page) => page.results);
  }, [repliesQuery.data.pages]);

  const handleCommentSubmitted = useHandleCommentSubmitted({ queryKey });
  const handleCommentPostedSuccessfully = useHandleCommentPostedSuccessfully({
    queryKey,
  });
  const handleRetryPostComment = useHandleRetryPostComment({ queryKey });
  const handleCommentDeleted = useHandleCommentDeleted({ queryKey });

  const retryPostMutation = useMutation({
    mutationFn: async () => {
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

  const handleDeleteClick = useCallback(() => {
    deleteCommentContract.writeContract({
      address: COMMENTS_V1_ADDRESS,
      abi: CommentsV1Abi,
      functionName: "deleteCommentAsAuthor",
      args: [comment.id],
    });
  }, [comment.id, deleteCommentContract]);

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
  const didDeletingFailed =
    !isDeleting &&
    (deleteCommentTransactionReceipt.data?.status === "reverted" ||
      deleteCommentContract.isError);

  const isPosting = postingCommentTxReceipt.isFetching;
  const didPostingFailed =
    !isPosting && postingCommentTxReceipt.data?.status === "reverted";

  return (
    <div className="mb-4 border-l-2 border-muted pl-4">
      <div className="flex justify-between items-center mb-2">
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
          <div className="text-xs text-muted-foreground">
            {comment.author?.ens?.name ??
              comment.author?.address ??
              "Unknown sender"}{" "}
            • {formatDate(comment.timestamp)}
          </div>
        </div>
        {isAuthor && !comment.pendingOperation && !comment.deletedAt && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-1 text-muted-foreground">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
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
          "mb-2 text-foreground",
          comment.deletedAt && "text-muted-foreground"
        )}
      >
        {comment.content}
      </div>
      <div className="mb-2">
        <CommentActionOrStatus
          comment={comment}
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
        <div className="mb-2">
          <CommentForm
            onLeftEmpty={() => setIsReplying(false)}
            onSubmitSuccess={(pendingOperation) => {
              setIsReplying(false);
              handleCommentSubmitted(pendingOperation);
            }}
            placeholder="What are your thoughts?"
            parentId={comment.id}
          />
        </div>
      )}
      {replies.map((reply) => (
        <Comment
          key={reply.id}
          comment={reply}
          onDelete={handleCommentDeleted}
          onPostSuccess={handleCommentPostedSuccessfully}
          onRetryPost={handleRetryPostComment}
        />
      ))}
      {repliesQuery.hasNextPage && (
        <div className="mb-2">
          <ActionButton onClick={() => repliesQuery.fetchNextPage()}>
            show more replies
          </ActionButton>
        </div>
      )}
    </div>
  );
}

function CommentActionOrStatus({
  comment,
  isDeleting,
  isPosting,
  postingFailed,
  deletingFailed,
  onReplyClick,
  onRetryDeleteClick,
  onRetryPostClick,
}: {
  comment: CommentType;
  isDeleting: boolean;
  isPosting: boolean;
  postingFailed: boolean;
  deletingFailed: boolean;
  onReplyClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
}) {
  if (postingFailed) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <MessageCircleWarningIcon className="w-3 h-3" />
        <span>
          Could not post the comment.{" "}
          <RetryButton onClick={onRetryPostClick}>Retry</RetryButton>
        </span>
      </div>
    );
  }

  if (deletingFailed) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <MessageCircleWarningIcon className="w-3 h-3" />
        <span>
          Could not delete the comment.{" "}
          <RetryButton onClick={onRetryDeleteClick}>Retry</RetryButton>
        </span>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Deleting...</span>
      </div>
    );
  }

  if (isPosting) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2Icon className="w-3 h-3 animate-spin" />
        <span>Posting...</span>
      </div>
    );
  }

  if (comment.pendingOperation) {
    return null;
  }

  return <ActionButton onClick={onReplyClick}>reply</ActionButton>;
}

type RetryButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
};

function RetryButton({ children, onClick }: RetryButtonProps) {
  return (
    <button
      className="inline-flex items-center justify-center font-semibold transition-colors rounded-md hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

type ActionButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
};

function ActionButton({ children, onClick }: ActionButtonProps) {
  return (
    <button
      className="inline-flex items-center justify-center transition-colors text-muted-foreground text-xs rounded-md hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
