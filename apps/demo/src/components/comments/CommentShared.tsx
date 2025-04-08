import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentPageSchema, type Comment as CommentType } from "@/lib/schemas";
import type {
  OnDeleteComment,
  OnRetryPostComment,
  OnSubmitSuccessFunction,
} from "@ecp.eth/shared/types";
import React, { useMemo, useState } from "react";
import { getAddress, type Hex } from "viem";
import { CommentActionButton } from "./CommentActionButton";
import { CommentText } from "./CommentText";
import { CommentActionOrStatus } from "./CommentActionOrStatus";
import { MoreVerticalIcon } from "lucide-react";
import { CommentAuthor } from "./CommentAuthor";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";
import { useInfiniteQuery } from "@tanstack/react-query";
import { publicEnv } from "@/publicEnv";
import {
  MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchCommentReplies } from "@ecp.eth/sdk";
import { useNewCommentsChecker } from "@ecp.eth/shared/hooks";

type CommentFormProps = {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  onSubmitSuccess: OnSubmitSuccessFunction;
  placeholder?: string;
  parentId?: Hex;
};

type CommentProps = {
  comment: CommentType;
  /**
   * Called when comment posting to blockchain failed and the transaction has been reverted
   * and user pressed retry.
   */
  onRetryPost: OnRetryPostComment;
  onDelete: OnDeleteComment;
  level: number;
};

type CommentSharedProps = {
  comment: CommentType;
  level: number;
  areRepliesAllowed: boolean;
  isDeleting: boolean;
  didDeletingFailed: boolean;
  isPosting: boolean;
  didPostingFailed: boolean;
  onDeleteClick: () => void;
  onReplySubmitSuccess: OnSubmitSuccessFunction;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onReplyDelete: OnDeleteComment;
  onReplyPost: OnRetryPostComment;
  ReplyComponent: React.ComponentType<CommentProps>;
  ReplyFormComponent: React.ComponentType<CommentFormProps>;
};

export function CommentShared({
  areRepliesAllowed,
  comment,
  isDeleting,
  didDeletingFailed,
  isPosting,
  didPostingFailed,
  level,
  onDeleteClick,
  onReplySubmitSuccess,
  onReplyDelete,
  onReplyPost,
  onRetryDeleteClick,
  onRetryPostClick,
  ReplyComponent,
  ReplyFormComponent,
}: CommentSharedProps) {
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);

  const queryKey = useMemo(
    () => ["comments", comment.id, connectedAddress],
    [comment.id, connectedAddress]
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
        viewer: connectedAddress,
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
        viewer: connectedAddress,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

  return (
    <div className={cn("mb-4 border-gray-200", level > 0 && "border-l-2 pl-4")}>
      <div className="flex justify-between items-center">
        <CommentAuthor
          author={comment.author}
          moderationStatus={comment.moderationStatus}
          timestamp={comment.timestamp}
        />
        {isAuthor && !comment.deletedAt && !comment.pendingOperation && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
              <MoreVerticalIcon className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={onDeleteClick}
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
          "mb-2 break-words hyphens-auto text-foreground",
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
          onRetryDeleteClick={onRetryDeleteClick}
          onReplyClick={() => setIsReplying((prev) => !prev)}
          onRetryPostClick={onRetryPostClick}
        />
      </div>
      {isReplying && (
        <ReplyFormComponent
          onLeftEmpty={() => {
            setIsReplying(false);
          }}
          onSubmitSuccess={(pendingOperation) => {
            setIsReplying(false);
            onReplySubmitSuccess(pendingOperation);
          }}
          placeholder="What are your thoughts?"
          parentId={
            level >= publicEnv.NEXT_PUBLIC_REPLY_DEPTH_CUTOFF &&
            comment.parentId
              ? comment.parentId
              : comment.id
          }
        />
      )}
      {hasNewComments && (
        <div className="mb-2">
          <CommentActionButton onClick={() => fetchNewComments()}>
            show new replies
          </CommentActionButton>
        </div>
      )}
      {replies.map((reply) => (
        <ReplyComponent
          key={`${reply.id}-${reply.deletedAt}`}
          comment={reply}
          onDelete={onReplyDelete}
          onRetryPost={onReplyPost}
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
