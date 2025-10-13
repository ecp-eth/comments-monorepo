import {
  CommentPageSchema,
  ListCommentsQueryPageParamsSchemaType,
  type Comment as CommentType,
} from "@ecp.eth/shared/schemas";
import { fetchCommentReplies } from "@ecp.eth/sdk/indexer";
import { useNewCommentsChecker } from "@ecp.eth/shared/hooks";
import { publicEnv } from "@/publicEnv";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { Comment } from "./Comment";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { ReplyItem } from "./ReplyItem";
import { useDeleteComment } from "./hooks/useDeleteComment";
import { useRetryPostComment } from "./hooks/useRetryPostComment";
import {
  createReplyItemsQueryKey,
  createCommentItemsQueryKey,
} from "./queries/queryKeys";
import {
  useEmbedConfig,
  type EmbedConfigProviderByTargetURIConfig,
  type EmbedConfigProviderByAuthorConfig,
  type EmbedConfigProviderByRepliesConfig,
} from "../EmbedConfigProvider";
import { useRetryEditComment } from "./hooks/useRetryEditComment";
import { useAccount, useChainId } from "wagmi";
import { CommentActionButton } from "@ecp.eth/shared/components";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import { Loader2Icon } from "lucide-react";
import { useSetupPendingAction } from "./hooks/useSetupPendingAction";
import { getAppSignerAddress } from "@/lib/utils";

type CommentItemProps = {
  comment: CommentType;
};

export function CommentItem({ comment }: CommentItemProps) {
  const { address: connectedAddress } = useAccount();
  const config = useEmbedConfig<
    | EmbedConfigProviderByTargetURIConfig
    | EmbedConfigProviderByRepliesConfig
    | EmbedConfigProviderByAuthorConfig
  >();
  const deleteComment = useDeleteComment();
  const retryPostComment = useRetryPostComment({
    connectedAddress,
  });
  const retryEditComment = useRetryEditComment({
    connectedAddress,
  });

  const [isEditing, setIsEditing] = useState(false);
  const chainId = useChainId();
  const replyItemsQueryKey = useMemo(
    () => createReplyItemsQueryKey(connectedAddress, chainId, comment.id),
    [comment.id, connectedAddress, chainId],
  );
  const commentItemsQueryKey = useMemo(
    () =>
      createCommentItemsQueryKey(
        connectedAddress,
        chainId,
        "targetUri" in config
          ? config.targetUri
          : "commentId" in config
            ? config.commentId
            : config.author,
      ),
    [config, connectedAddress, chainId],
  );

  const firstPageParamOfReplies: ListCommentsQueryPageParamsSchemaType =
    useMemo(() => {
      return {
        cursor: undefined,
        limit:
          comment.replies?.pagination.limit ??
          MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
      };
    }, [comment.replies]);

  const repliesQuery = useInfiniteQuery({
    enabled: comment.pendingOperation?.action !== "post",
    queryKey: replyItemsQueryKey,
    initialData: comment.replies
      ? {
          pages: [comment.replies],
          pageParams: [firstPageParamOfReplies],
        }
      : undefined,
    initialPageParam: firstPageParamOfReplies,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchCommentReplies({
        chainId,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: getAppSignerAddress(config.app),
        cursor: pageParam.cursor,
        limit: pageParam.limit,
        commentId: comment.id,
        signal,
        viewer: connectedAddress,
        mode: comment.parentId ? undefined : "flat",
        commentType: COMMENT_TYPE_COMMENT,
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
    enabled: comment.pendingOperation?.action !== "post",
    queryData: repliesQuery.data,
    queryKey: replyItemsQueryKey,
    fetchComments({ cursor, signal }) {
      return fetchCommentReplies({
        chainId,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: getAppSignerAddress(config.app),
        commentId: comment.id,
        cursor,
        limit: 10,
        sort: "asc",
        signal,
        viewer: connectedAddress,
        mode: comment.parentId ? undefined : "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const onDeleteClick = useCallback(() => {
    deleteComment({
      commentId: comment.id,
      queryKey: commentItemsQueryKey,
    });
  }, [comment, deleteComment, commentItemsQueryKey]);

  const onRetryPostClick = useCallback(() => {
    retryPostComment({ comment, queryKey: commentItemsQueryKey });
  }, [comment, retryPostComment, commentItemsQueryKey]);

  const onRetryEditClick = useCallback(() => {
    retryEditComment({ comment, queryKey: commentItemsQueryKey });
  }, [comment, retryEditComment, commentItemsQueryKey]);

  const onEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const { isLiking, isReplying, setIsReplying } = useSetupPendingAction({
    comment,
    queryKey: commentItemsQueryKey,
  });

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

  return (
    <div className="mb-4 border-muted">
      {isEditing ? (
        <CommentEditForm
          comment={comment}
          queryKey={commentItemsQueryKey}
          onCancel={() => setIsEditing(false)}
          onSubmitStart={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <Comment
          key={`${comment.id}-${comment.deletedAt}`}
          comment={comment}
          onDeleteClick={onDeleteClick}
          onRetryDeleteClick={onDeleteClick}
          onRetryPostClick={onRetryPostClick}
          onEditClick={onEditClick}
          onRetryEditClick={onRetryEditClick}
          optimisticReferences={
            comment.pendingOperation?.action === "post"
              ? comment.pendingOperation.references
              : undefined
          }
          isLiking={isLiking}
        />
      )}
      {isReplying && (
        <CommentForm
          onCancel={() => setIsReplying(false)}
          onSubmitStart={() => {
            setIsReplying(false);
          }}
          placeholder="What are your thoughts?"
          parentId={comment.id}
          queryKey={replyItemsQueryKey}
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
        <ReplyItem
          key={reply.id}
          comment={reply}
          queryKey={replyItemsQueryKey}
        />
      ))}
      {repliesQuery.hasNextPage && (
        <div className="mb-2">
          <CommentActionButton
            className="gap-2"
            disabled={repliesQuery.isFetchingNextPage}
            onClick={() => repliesQuery.fetchNextPage()}
          >
            {repliesQuery.isFetchingNextPage ? (
              <>
                <Loader2Icon className="animate-spin h-4 w-4" /> loading...
              </>
            ) : (
              "show more replies"
            )}
          </CommentActionButton>
        </div>
      )}
    </div>
  );
}
