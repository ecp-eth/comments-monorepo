"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";
import { Comment } from "./Comment";
import { CommentForm } from "./CommentForm";
import { CommentPageSchema } from "@/lib/schemas";
import { useAccount } from "wagmi";
import { useEmbedConfig } from "../EmbedConfigProvider";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";

const COMMENTS_PER_PAGE = 10;

export function CommentSection() {
  const { targetUri } = useEmbedConfig();
  const account = useAccount();

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["comments", targetUri],
      initialPageParam: {
        offset: 0,
      },
      queryFn: async ({ pageParam, signal }) => {
        const searchParams = new URLSearchParams({
          targetUri,
          offset: pageParam.offset.toString(),
          limit: COMMENTS_PER_PAGE.toString(),
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
        };
      },
    });

  const handleCommentDeleted = useCallback(() => {
    refetch();
  }, [refetch]);

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
          <CommentForm onSubmitSuccess={() => refetch()} />
        ) : (
          <ConnectButton />
        )}
      </div>
      {results.map((comment) => (
        <Comment
          comment={comment}
          key={comment.id}
          onDelete={handleCommentDeleted}
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
