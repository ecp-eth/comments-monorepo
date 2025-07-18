"use client";

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
  NEW_COMMENTS_BY_AUTHOR_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchComments } from "@ecp.eth/sdk/indexer";
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
  EmbedConfigProviderByAuthorConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import { useChainId } from "wagmi";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";

type QueryData = InfiniteData<
  CommentPageSchemaType,
  { cursor: Hex | undefined; limit: number }
>;

type CommentSectionReadonlyProps = {
  author: Hex;
  initialData?: QueryData;
};

export function CommentSectionReadonly({
  initialData,
  author,
}: CommentSectionReadonlyProps) {
  const { currentTimestamp, disablePromotion } =
    useEmbedConfig<EmbedConfigProviderByAuthorConfig>();
  const chainId = useChainId();
  const queryKey = useMemo(
    () => ["comments-by-author", chainId, author],
    [author, chainId],
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
        const response = await fetchComments({
          app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          author,
          limit: pageParam.limit,
          cursor: pageParam.cursor,
          chainId,
          signal,
          commentType: COMMENT_TYPE_COMMENT,
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
    queryKey: ["comments-by-author-new-comments-check", chainId, author],
    queryFn: async ({ client, signal }) => {
      const newComments = await fetchComments({
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        author,
        limit: 20,
        cursor: data?.pages[0].pagination.startCursor,
        sort: "asc",
        chainId,
        signal,
        commentType: COMMENT_TYPE_COMMENT,
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

  if (isPending) {
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
      {!disablePromotion && <PoweredBy className="mt-4" />}
    </div>
  );
}
