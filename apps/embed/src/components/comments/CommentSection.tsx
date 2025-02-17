"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";
import {
  Comment,
  OnDeleteComment,
  OnPostCommentSuccess,
  OnRetryPostComment,
} from "./Comment";
import { CommentForm, type OnSubmitSuccessFunction } from "./CommentForm";
import { CommentPageSchema } from "@/lib/schemas";
import { useAccount } from "wagmi";
import { useEmbedConfig } from "../EmbedConfigProvider";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import {
  deletePendingCommentByTransactionHash,
  insertPendingCommentToPage,
  markCommentAsDeleted,
  replaceCommentPendingOperationByComment,
} from "./helpers";

const COMMENTS_PER_PAGE = 10;

export function CommentSection() {
  const { targetUri } = useEmbedConfig();
  const account = useAccount();

  const client = useQueryClient();
  const queryKey = useMemo(() => ["comments", targetUri], [targetUri]);

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialPageParam: {
        offset: 0,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: async ({ pageParam, signal }) => {
        const searchParams = new URLSearchParams({
          targetUri,
          offset: pageParam.offset.toString(),
          limit: pageParam.limit.toString(),
        });

        const response = await fetch(
          `/api/comments?${searchParams.toString()}`,
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

  type CommentsQueryData = typeof data;

  const handleCommentDeleted = useCallback<OnDeleteComment>(
    (commentId) => {
      // replace content of the comment with redacted message
      client.setQueryData<typeof data>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return markCommentAsDeleted(oldData, commentId);
      });
    },
    [queryKey, client]
  );

  const handleCommentSubmitted = useCallback<OnSubmitSuccessFunction>(
    (pendingOperation) => {
      client.setQueryData<CommentsQueryData>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return insertPendingCommentToPage(oldData, pendingOperation);
      });
    },
    [queryKey, client]
  );

  const handleCommentPostedSuccessfully = useCallback<OnPostCommentSuccess>(
    (transactionHash) => {
      client.setQueryData<CommentsQueryData>(queryKey, (oldData) => {
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
      client.setQueryData<CommentsQueryData>(queryKey, (oldData) => {
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

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        description="Failed to load comments. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Comments</h2>
      <div className="mb-4">
        {account.address ? (
          <CommentForm onSubmitSuccess={handleCommentSubmitted} />
        ) : (
          <ConnectButton />
        )}
      </div>
      {results.map((comment) => (
        <Comment
          comment={comment}
          key={comment.id}
          onDelete={handleCommentDeleted}
          onPostSuccess={handleCommentPostedSuccessfully}
          onRetryPost={handleRetryPostComment}
        />
      ))}
      {hasNextPage && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => fetchNextPage()}
        >
          Load More
        </button>
      )}
    </div>
  );
}
