"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import never from "never";
import { CommentForm } from "./CommentForm";
import { cn } from "@/lib/utils";
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
import { COMMENTS_V1_ADDRESS, fetchCommentReplies } from "@ecp.eth/sdk";
import {
  CommentPageSchema,
  type PendingCommentOperationSchemaType,
  type Comment as CommentType,
  ListCommentsQueryPageParamsSchemaType,
} from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useFreshRef } from "@/hooks/useFreshRef";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { submitCommentMutationFunction } from "./queries";
import {
  useHandleCommentDeleted,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
  useNewCommentsChecker,
} from "./hooks";
import { Button } from "../ui/button";
import { MAX_INITIAL_REPLIES_ON_PARENT_COMMENT } from "@/lib/constants";
import { CommentText } from "./CommentText";
import { createQuotationFromComment } from "./helpers";
import { publicEnv } from "@/publicEnv";
import { CommentAuthor } from "./CommentAuthor";

export type OnDeleteComment = (id: Hex) => void;
export type OnRetryPostComment = (
  comment: CommentType,
  newPendingOperation: PendingCommentOperationSchemaType
) => void;

interface CommentProps {
  comment: CommentType;
  /**
   * @default 1
   */
  depth?: number;
  onDelete?: OnDeleteComment;
  /**
   * Called when comment posting to blockchain failed and the transaction has been reverted
   * and user pressed retry.
   */
  onRetryPost: OnRetryPostComment;
  /**
   * Used to calculate relative time in comments.
   */
  currentTimestamp: number;
}

export function Comment({
  depth = 1,
  comment,
  onDelete,
  onRetryPost,
  currentTimestamp,
}: CommentProps) {
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const onDeleteRef = useFreshRef(onDelete);
  /**
   * Prevents infinite cycle when delete comment transaction succeeded
   * because comment is updated to be redacted
   */
  const commentRef = useFreshRef(comment);
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);
  const areRepliesAllowed = depth < 2;
  const submitTargetCommentId = areRepliesAllowed
    ? comment.id
    : (comment.parentId ?? never("parentId is required for comment depth > 0"));
  const submitTargetQueryKey = useMemo(
    () => ["comments", submitTargetCommentId],
    [submitTargetCommentId]
  );
  const queryKey = useMemo(() => ["comments", comment.id], [comment.id]);

  const repliesQuery = useInfiniteQuery({
    enabled: areRepliesAllowed,
    queryKey,
    initialPageParam: {
      cursor: comment.replies?.pagination.endCursor,
      limit:
        comment.replies?.pagination.limit ??
        MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
    } as ListCommentsQueryPageParamsSchemaType,
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
    getNextPageParam(
      lastPage
    ): ListCommentsQueryPageParamsSchemaType | undefined {
      if (!lastPage.pagination.hasNext) {
        return;
      }

      return {
        cursor: lastPage.pagination.endCursor,
        limit: lastPage.pagination.limit,
      };
    },
  });

  const { hasNewComments, fetchNewComments } = useNewCommentsChecker({
    queryData: repliesQuery.data,
    queryKey,
    fetchComments({ cursor, signal }) {
      return fetchCommentReplies({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        commentId: comment.id,
        cursor,
        limit: 10,
        sort: "asc",
        signal,
      });
    },
  });

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

  const handleCommentSubmitted = useHandleCommentSubmitted({
    queryKey: submitTargetQueryKey,
  });
  const handleRetryPostComment = useHandleRetryPostComment({
    queryKey: submitTargetQueryKey,
  });
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
      toast.success("Comment posted");
    }
  }, [postingCommentTxReceipt.data]);

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
        <CommentAuthor
          author={comment.author}
          timestamp={comment.timestamp}
          currentTimestamp={currentTimestamp}
        />
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
          "mb-2 text-foreground break-all",
          comment.deletedAt && "text-muted-foreground"
        )}
      >
        <CommentText
          // make sure comment is updated if was deleted
          key={comment.deletedAt?.toISOString()}
          text={comment.content}
        />
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
        <div className="mb-2">
          <CommentForm
            initialContent={
              areRepliesAllowed
                ? undefined
                : createQuotationFromComment(comment)
            }
            onLeftEmpty={() => setIsReplying(false)}
            onSubmitSuccess={(pendingOperation) => {
              setIsReplying(false);
              handleCommentSubmitted(pendingOperation);
            }}
            placeholder="What are your thoughts?"
            parentId={submitTargetCommentId}
          />
        </div>
      )}
      {hasNewComments && (
        <div className="mb-2">
          <ActionButton onClick={() => fetchNewComments()}>
            show new replies
          </ActionButton>
        </div>
      )}
      {replies.map((reply) => (
        <Comment
          depth={depth + 1}
          key={reply.id}
          comment={reply}
          onDelete={handleCommentDeleted}
          onRetryPost={handleRetryPostComment}
          currentTimestamp={currentTimestamp}
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
  hasAccountConnected,
  hasRepliesAllowed,
  isDeleting,
  isPosting,
  postingFailed,
  deletingFailed,
  onReplyClick,
  onRetryDeleteClick,
  onRetryPostClick,
}: {
  comment: CommentType;
  hasAccountConnected: boolean;
  hasRepliesAllowed: boolean;
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

  if (comment.pendingOperation || !hasAccountConnected || !hasRepliesAllowed) {
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
