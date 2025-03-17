"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import { Button } from "../ui/button";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_BY_AUTHOR_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchComments } from "@ecp.eth/sdk";
import { CommentPageSchema, type CommentPageSchemaType } from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { CommentByAuthor } from "./CommentByAuthor";
import { NoCommentsScreen } from "../NoCommentsScreen";
import { publicEnv } from "@/publicEnv";

type QueryData = InfiniteData<
  CommentPageSchemaType,
  { cursor: Hex | undefined; limit: number }
>;

type CommentSectionReadonlyProps = {
  author: Hex;
  initialData?: QueryData;
  /**
   * Used to calculate relative time in comments.
   */
  currentTimestamp: number;
};

export function CommentSectionReadonly({
  initialData,
  author,
  currentTimestamp,
}: CommentSectionReadonlyProps) {
  const queryKey = useMemo(() => ["comments-by-author", author], [author]);

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialData,
      initialPageParam: {
        cursor: undefined as Hex | undefined,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchComments({
          appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          author,
          limit: pageParam.limit,
          cursor: pageParam.cursor,
          signal,
        });

        return CommentPageSchema.parse(response);
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
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

  // check for new comments
  useQuery({
    enabled: !!data,
    queryKey: ["comments-by-author-new-comments-check", author],
    queryFn: async ({ client, signal }) => {
      const newComments = await fetchComments({
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        author,
        limit: 20,
        cursor: data?.pages[0].pagination.startCursor,
        sort: "asc",
        signal,
      });

      if (newComments.results.length === 0) {
        return newComments;
      }

      client.setQueryData<QueryData>(queryKey, (oldData): QueryData => {
        if (!oldData) {
          return {
            pages: [newComments],
            pageParams: [
              {
                cursor: newComments.pagination.endCursor,
                limit: newComments.pagination.limit,
              },
            ],
          };
        }

        return {
          pages: [newComments, ...oldData.pages],
          pageParams: [
            {
              cursor: newComments.pagination.endCursor,
              limit: newComments.pagination.limit,
            },
            ...oldData.pageParams,
          ],
        };
      });

      return newComments;
    },
    refetchInterval: NEW_COMMENTS_BY_AUTHOR_CHECK_INTERVAL,
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
        <CommentByAuthor
          comment={comment}
          key={comment.id}
          currentTimestamp={currentTimestamp}
        />
      ))}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
          Load More
        </Button>
      )}
    </div>
  );
}
