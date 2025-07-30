"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import { Button } from "../ui/button";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_BY_AUTHOR_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchComments, FetchCommentsOptions } from "@ecp.eth/sdk/indexer";
import {
  type CommentPageSchemaType,
  CommentPageSchema,
} from "@ecp.eth/shared/schemas";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { CommentByAuthor } from "./CommentByAuthor";
import { NoCommentsScreen } from "../NoCommentsScreen";
import { PoweredBy } from "@ecp.eth/shared/components";
import {
  EmbedConfigProviderByAuthorConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import { useAccount, useChainId } from "wagmi";
import { createCommentItemsQueryKey } from "./queries";
import {
  useIsAccountStatusResolved,
  useNewCommentsChecker,
} from "@ecp.eth/shared/hooks";
import { useSyncViewerCookie } from "@/hooks/useSyncViewerCookie";
import { useAutoBodyMinHeight } from "@/hooks/useAutoBodyMinHeight";

type QueryData = InfiniteData<
  CommentPageSchemaType,
  { cursor: Hex | undefined; limit: number }
>;

type CommentSectionReadonlyProps = {
  author: Hex;
  initialData?: QueryData;
  fetchCommentParams: FetchCommentsOptions;
};

export function CommentSectionReadonly({
  initialData,
  author,
  fetchCommentParams,
}: CommentSectionReadonlyProps) {
  useSyncViewerCookie();
  useAutoBodyMinHeight();

  const { address: connectedAddress } = useAccount();
  const isAccountStatusResolved = useIsAccountStatusResolved();
  const { currentTimestamp, disablePromotion } =
    useEmbedConfig<EmbedConfigProviderByAuthorConfig>();
  const chainId = useChainId();
  const queryKey = useMemo(
    () => createCommentItemsQueryKey(connectedAddress, chainId, author),
    [connectedAddress, chainId, author],
  );

  const { data, isPending, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialData,
      initialPageParam: initialData?.pageParams[0] || {
        cursor: undefined,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchComments({
          ...fetchCommentParams,
          limit: pageParam.limit,
          cursor: pageParam.cursor,
          viewer: connectedAddress,
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

  const { hasNewComments, fetchNewComments } = useNewCommentsChecker({
    enabled: isAccountStatusResolved,
    queryData: data,
    queryKey,
    fetchComments(options) {
      return fetchComments({
        ...fetchCommentParams,
        cursor: options.cursor,
        signal: options.signal,
        viewer: connectedAddress,
        sort: "asc",
        mode: "flat",
      });
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
      {hasNewComments && (
        <Button
          className="mb-4"
          onClick={() => fetchNewComments()}
          variant="secondary"
          size="sm"
        >
          Load new comments
        </Button>
      )}
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
