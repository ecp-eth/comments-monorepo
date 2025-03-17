import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommentPageSchemaType,
  type Comment as CommentType,
} from "@/lib/schemas";
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
import {
  DefinedUseInfiniteQueryResult,
  InfiniteData,
} from "@tanstack/react-query";
import { publicEnv } from "@/publicEnv";

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
  hasNewReplies: boolean;
  fetchNewReplies: () => void;
  onDeleteClick: () => void;
  onReplySubmitSuccess: OnSubmitSuccessFunction;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onReplyDelete: OnDeleteComment;
  onReplyPost: OnRetryPostComment;
  ReplyComponent: React.ComponentType<CommentProps>;
  ReplyFormComponent: React.ComponentType<CommentFormProps>;
  repliesQuery: DefinedUseInfiniteQueryResult<
    InfiniteData<CommentPageSchemaType>
  >;
};

export function CommentShared({
  areRepliesAllowed,
  comment,
  isDeleting,
  didDeletingFailed,
  isPosting,
  didPostingFailed,
  level,
  hasNewReplies,
  fetchNewReplies,
  onDeleteClick,
  onReplySubmitSuccess,
  onReplyDelete,
  onReplyPost,
  onRetryDeleteClick,
  onRetryPostClick,
  ReplyComponent,
  ReplyFormComponent,
  repliesQuery,
}: CommentSharedProps) {
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <CommentAuthor author={comment.author} timestamp={comment.timestamp} />
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
      {hasNewReplies && (
        <div className="mb-2">
          <CommentActionButton onClick={() => fetchNewReplies()}>
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
