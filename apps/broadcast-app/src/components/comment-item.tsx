"use client";

import { useCallback, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HeartIcon,
  MoreHorizontalIcon,
  ReplyIcon,
  EditIcon,
  TrashIcon,
  FlagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isZeroHex } from "@ecp.eth/sdk/core";
import {
  formatContractFunctionExecutionError,
  getCommentAuthorNameOrAddress,
} from "@ecp.eth/shared/helpers";
import { renderToReact } from "@ecp.eth/shared/renderer";
import { blo } from "blo";
import { CommentMediaReferences } from "@ecp.eth/shared/components/CommentMediaReferences";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { useCommentIsHearted, useFreshRef } from "@ecp.eth/shared/hooks";
import {
  useConnectBeforeAction,
  useConsumePendingWalletConnectionActions,
} from "./pending-wallet-connections-context";
import {
  type CommentRepliesQueryPageParam,
  useCommentRepliesQuery,
} from "@/queries/comment";
import { MAX_INITIAL_REPLIES_ON_PARENT_COMMENT } from "@/constants";
import { chain } from "@/wagmi/config";
import { useAccount } from "wagmi";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import { useLikeComment } from "@/hooks/useLikeComment";
import { toast } from "sonner";
import { ContractFunctionExecutionError } from "viem";
import {
  createChannelCommentsQueryKey,
  createCommentRepliesQueryKey,
} from "@/queries/query-keys";
import { useUnlikeComment } from "@/hooks/useUnlikeComment";
import { useDeleteComment } from "@/hooks/useDeleteComment";
import type { Comment, CommentPageSchemaType } from "@ecp.eth/shared/schemas";
import { useCheckForNewReplies } from "@/hooks/useCheckForNewReplies";

interface CommentItemProps {
  comment: Comment;
  threadComment: Comment;
  onReply: (comment: Comment, commentQueryKey: QueryKey) => void;
  onEdit: (comment: Comment, commentQueryKey: QueryKey) => void;
}

export function CommentItem({
  comment,
  threadComment,
  onReply,
  onEdit,
}: CommentItemProps) {
  const { address: viewer } = useAccount();
  const isReply = !(!comment.parentId || isZeroHex(comment.parentId));
  const isHearted = useCommentIsHearted(comment);
  const nameOrAddress = getCommentAuthorNameOrAddress(comment.author);
  const avatarUrl =
    comment.author.ens?.avatarUrl || comment.author.farcaster?.pfpUrl;

  const { element, isTruncated, mediaReferences } = useMemo(() => {
    return renderToReact({
      content: comment.content,
      references: comment.references,
      maxLength: 200,
      maxLines: 5,
    });
  }, [comment.content, comment.references]);

  const [showFullContent, setShowFullContent] = useState(isTruncated);

  const rootQueryKey = useMemo(
    () =>
      createChannelCommentsQueryKey({
        channelId: comment.channelId,
        viewer,
      }),
    [comment.channelId, viewer],
  );
  const repliesQueryKey = useMemo(
    () =>
      createCommentRepliesQueryKey({
        commentId: threadComment.id,
        viewer,
      }),
    [threadComment.id, viewer],
  );

  const connectBeforeAction = useConnectBeforeAction();
  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();
  const deleteComment = useDeleteComment();

  useConsumePendingWalletConnectionActions({
    commentId: comment.id,
    onLikeAction: () => {
      if (!viewer) {
        throw new Error("Please connect your wallet to like a comment");
      }

      likeComment.mutate({
        address: viewer,
        comment,
        queryKey:
          comment.id === threadComment.id ? rootQueryKey : repliesQueryKey,
        onError(error) {
          const message =
            error instanceof ContractFunctionExecutionError
              ? formatContractFunctionExecutionError(error)
              : error.message;

          toast.error(message);
        },
      });
    },
    onUnlikeAction: () => {
      if (!viewer) {
        throw new Error("Please connect your wallet to unlike a comment");
      }

      unlikeComment.mutate({
        comment,
        queryKey:
          comment.id === threadComment.id ? rootQueryKey : repliesQueryKey,
        onError(error) {
          const message =
            error instanceof ContractFunctionExecutionError
              ? formatContractFunctionExecutionError(error)
              : error.message;

          toast.error(message);
        },
      });
    },
    onPrepareReplyAction: () => {
      onReply(comment, repliesQueryKey);
    },
  });

  const initialData = useMemo((): InfiniteData<
    CommentPageSchemaType,
    CommentRepliesQueryPageParam
  > => {
    if (comment.replies) {
      return {
        pages: [
          {
            extra: comment.replies.extra,
            pagination: comment.replies.pagination,
            results: comment.replies.results.map((reply) => ({
              ...reply,
              replies: {
                extra: comment.replies!.extra,
                pagination: {
                  hasNext: false,
                  hasPrevious: false,
                  limit: 0,
                },
                results: [],
              },
            })),
          },
        ],
        pageParams: [
          {
            cursor: comment.replies.pagination.endCursor,
            limit: comment.replies.pagination.limit,
            direction: "newer",
          },
        ],
      };
    }

    return {
      pages: [
        {
          results: [],
          extra: {
            moderationEnabled: false,
            moderationKnownReactions: [],
          },
          pagination: {
            hasNext: false,
            hasPrevious: false,
            limit: MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
          },
        },
      ],
      pageParams: [
        {
          cursor: undefined,
          limit: MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
          direction: "newer",
        },
      ],
    };
  }, [comment]);

  const repliesQuery = useCommentRepliesQuery({
    // replies are only fetched on first level because we are using flat mode
    enabled: threadComment.id === comment.id,
    chainId: chain.id,
    channelId: comment.channelId,
    commentId: comment.id,
    viewer,
    initialData,
  });

  useCheckForNewReplies({
    enabled: threadComment.id === comment.id,
    comment: threadComment,
    viewer,
  });

  const replies = useMemo(() => {
    if (repliesQuery.status !== "success") {
      return [];
    }

    return repliesQuery.data.pages.flatMap((page) => page.results);
  }, [repliesQuery.status, repliesQuery.data]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine which actions are available
  const isCommentAuthor =
    viewer && comment.author.address.toLowerCase() === viewer.toLowerCase();
  const canEdit = isCommentAuthor && !comment.deletedAt;
  const canDelete = isCommentAuthor && !comment.deletedAt;
  const canReport = !isCommentAuthor && !comment.deletedAt;

  // Only show dropdown if any action is available
  const hasAnyAction = canEdit || canDelete || canReport;

  const onEditRef = useFreshRef(onEdit);

  const handleEditComment = useCallback(() => {
    const queryKey =
      comment.id === threadComment.id ? rootQueryKey : repliesQueryKey;

    onEditRef.current?.(comment, queryKey);
  }, [comment, threadComment, rootQueryKey, repliesQueryKey, onEditRef]);

  const handleDeleteComment = useCallback(() => {
    const queryKey =
      comment.id === threadComment.id ? rootQueryKey : repliesQueryKey;

    deleteComment.mutate({
      comment,
      queryKey,
    });
  }, [comment, threadComment, rootQueryKey, repliesQueryKey, deleteComment]);

  const handleReportComment = () => {
    // TODO: Implement report comment functionality
    toast.info("Report functionality coming soon");
  };

  return (
    <div className={cn("space-y-3", isReply && "pl-4 border-l-2 border-muted")}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8 shrink-0">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={nameOrAddress} />
          ) : (
            <AvatarImage
              src={blo(comment.author.address)}
              alt={nameOrAddress}
            />
          )}
          <AvatarFallback>
            {nameOrAddress.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{nameOrAddress}</span>
            <span>•</span>
            <span>{formatDate(comment.createdAt)}</span>
            {comment.revision !== 0 && (
              <>
                <span>•</span>
                <span>edited</span>
              </>
            )}
          </div>

          <div className="text-sm">
            <div className="whitespace-pre-wrap break-words">{element}</div>
            {isTruncated && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => setShowFullContent(!showFullContent)}
              >
                {showFullContent ? "Hide" : "Show more"}
              </Button>
            )}
          </div>

          {mediaReferences.length > 0 && (
            <div className="mt-2">
              <CommentMediaReferences
                content={comment.content}
                references={comment.references}
              />
            </div>
          )}

          <div className="flex items-center space-x-4 pt-1">
            <Button
              disabled={likeComment.isPending || unlikeComment.isPending}
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto p-0 text-xs space-x-1",
                (isHearted || likeComment.isPending) &&
                  !unlikeComment.isPending &&
                  "text-red-500",
              )}
              onClick={connectBeforeAction(() => {
                const newIsHearted = !isHearted;

                return {
                  type: newIsHearted ? "like" : "unlike",
                  commentId: comment.id,
                };
              })}
            >
              <HeartIcon
                className={cn(
                  "h-3 w-3",
                  (isHearted || likeComment.isPending) &&
                    !unlikeComment.isPending &&
                    "fill-current",
                  (likeComment.isPending || unlikeComment.isPending) &&
                    "animate-pulse",
                )}
              />
              <span>
                {comment.reactionCounts?.[COMMENT_REACTION_LIKE_CONTENT] ?? 0}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs space-x-1"
              onClick={connectBeforeAction(() => {
                return {
                  type: "prepareReply",
                  commentId: comment.id,
                };
              })}
            >
              <ReplyIcon className="h-3 w-3" />
              <span>Reply</span>
            </Button>

            {hasAnyAction && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs"
                  >
                    <MoreHorizontalIcon className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={handleEditComment}>
                      <EditIcon className="h-4 w-4 mr-2" />
                      Edit comment
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={handleDeleteComment}
                      disabled={deleteComment.isPending}
                      className="text-destructive focus:text-destructive"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      {deleteComment.isPending
                        ? "Deleting..."
                        : "Delete comment"}
                    </DropdownMenuItem>
                  )}
                  {canReport && (
                    <DropdownMenuItem onClick={handleReportComment}>
                      <FlagIcon className="h-4 w-4 mr-2" />
                      Report comment
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="space-y-3 pl-8">
          {repliesQuery.hasPreviousPage && (
            <Button
              disabled={repliesQuery.isFetchingPreviousPage}
              variant="ghost"
              size="sm"
              type="button"
              className={cn(
                "text-xs",
                repliesQuery.isFetchingPreviousPage && "animate-pulse",
              )}
              onClick={() => repliesQuery.fetchPreviousPage()}
            >
              Show newer replies
            </Button>
          )}
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              threadComment={threadComment}
            />
          ))}
          {repliesQuery.hasNextPage && (
            <Button
              disabled={repliesQuery.isFetchingNextPage}
              variant="ghost"
              size="sm"
              type="button"
              className={cn(
                "text-xs",
                repliesQuery.isFetchingNextPage && "animate-pulse",
              )}
              onClick={() => repliesQuery.fetchNextPage()}
            >
              Show older replies
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
