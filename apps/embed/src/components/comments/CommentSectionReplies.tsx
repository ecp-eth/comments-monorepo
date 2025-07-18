"use client";

import React from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import { Button } from "../ui/button";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchCommentReplies } from "@ecp.eth/sdk/indexer";
import {
  type CommentPageSchemaType,
  CommentPageSchema,
} from "@ecp.eth/shared/schemas";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { CommentByAuthor } from "./CommentByAuthor";
import { NoCommentsScreen } from "../NoCommentsScreen";
import { publicEnv } from "@/publicEnv";
import { PoweredBy } from "@ecp.eth/shared/components";
import {
  EmbedConfigProviderByRepliesConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import { useChainId } from "wagmi";
import { CommentForm } from "./CommentForm";

type QueryData = InfiniteData<
  CommentPageSchemaType,
  { cursor: Hex | undefined; limit: number }
>;

type CommentSectionRepliesProps = {
  commentId: Hex;
  initialData?: QueryData;
};

export function CommentSectionReplies({
  initialData,
  commentId,
}: CommentSectionRepliesProps) {
  const { currentTimestamp, disablePromotion } =
    useEmbedConfig<EmbedConfigProviderByRepliesConfig>();
  const chainId = useChainId();
  const queryKey = useMemo(
    () => ["comments-by-replies", chainId, commentId],
    [commentId, chainId],
  );

  const { data, isPending, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialData,
      initialPageParam: {
        cursor: undefined as Hex | undefined,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchCommentReplies({
          app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          commentId,
          limit: pageParam.limit,
          cursor: pageParam.cursor,
          chainId,
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
    queryKey: ["comments-by-replies-new-comments-check", chainId, commentId],
    queryFn: async ({ client, signal }) => {
      const newComments = await fetchCommentReplies({
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        commentId,
        limit: 20,
        cursor: data?.pages[0].pagination.startCursor,
        sort: "asc",
        chainId,
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
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  if (isPending) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        description="Failed to load replies. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-headline font-bold mb-4 text-foreground">Comments</h2>
      <div className="mb-4">
        <CommentForm
          placeholder="What are your thoughts?"
          parentId={commentId}
        />
      </div>
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
      {!disablePromotion && <PoweredBy className="mt-4" />}
    </div>
  );
}
