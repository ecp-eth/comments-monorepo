"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertTriangleIcon,
  HeartIcon,
  Loader2Icon,
  ReplyIcon,
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
import { useCommentIsHearted } from "@ecp.eth/shared/hooks";
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
import type { Comment, CommentPageSchemaType } from "@ecp.eth/shared/schemas";
import { useRetryPostComment } from "@/hooks/useRetryPostComment";

interface CommentItemProps {
  comment: Comment;
  threadComment: Comment;
  onReply: (comment: Comment, commentQueryKey: QueryKey) => void;
}

export function CommentItem({
  comment,
  threadComment,
  onReply,
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
  const retryPostComment = useRetryPostComment();

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
        { cursor: undefined, limit: MAX_INITIAL_REPLIES_ON_PARENT_COMMENT },
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
            {comment.pendingOperation?.action === "post" &&
              comment.pendingOperation.state.status === "pending" && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Loader2Icon className="w-3 h-3 animate-spin" />
                  <span className="text-xs ">Posting...</span>
                </div>
              )}

            {comment.pendingOperation?.action === "post" &&
              comment.pendingOperation.state.status === "error" && (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertTriangleIcon className="w-3 h-3" />
                  <span className="text-xs">Failed to post.</span>
                  <button
                    className="font-semibold text-xs"
                    type="button"
                    onClick={() => {
                      retryPostComment.mutate({
                        comment,
                        queryKey:
                          comment.id === threadComment.id
                            ? rootQueryKey
                            : repliesQueryKey,
                      });
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

            {(!comment.pendingOperation ||
              comment.pendingOperation.state.status === "success") && (
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
            )}

            {(!comment.pendingOperation ||
              comment.pendingOperation.state.status === "success") && (
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
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="space-y-3 pl-8">
          <Button variant="ghost" size="sm" type="button" className="text-xs">
            Show newer replies
          </Button>
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              threadComment={threadComment}
            />
          ))}
          <Button variant="ghost" size="sm" type="button" className="text-xs">
            Show older replies
          </Button>
        </div>
      )}
    </div>
  );
}
