"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import { Button } from "../ui/button";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { fetchComments } from "@ecp.eth/sdk";
import { CommentPageSchema, type CommentPageSchemaType } from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { CommentByAuthor } from "./CommentByAuthor";
import { NoCommentsScreen } from "../NoCommentsScreen";
import { publicEnv } from "@/publicEnv";

type CommentSectionReadonlyProps = {
  author: Hex;
  initialData?: InfiniteData<
    CommentPageSchemaType,
    { offset: number; limit: number }
  >;
};

export function CommentSectionReadonly({
  initialData,
  author,
}: CommentSectionReadonlyProps) {
  const queryKey = useMemo(() => ["comments-by-author", author], [author]);

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialData,
      initialPageParam: {
        offset: 0,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchComments({
          appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          author,
          limit: pageParam.limit,
          offset: pageParam.offset,
          signal,
        });

        return CommentPageSchema.parse(response);
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
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
      <h2 className="text-headline font-bold mb-4 text-foreground">Comments</h2>
      {results.length === 0 && <NoCommentsScreen />}
      {results.map((comment) => (
        <CommentByAuthor comment={comment} key={comment.id} />
      ))}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
          Load More
        </Button>
      )}
    </div>
  );
}
