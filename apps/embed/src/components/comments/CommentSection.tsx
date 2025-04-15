"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CommentForm } from "./CommentForm";
import {
  EmbedConfigProviderByTargetURIConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import { useNewCommentsChecker } from "@ecp.eth/shared/hooks";
import { Button } from "../ui/button";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchComments } from "@ecp.eth/sdk";
import {
  type ListCommentsQueryPageParamsSchemaType,
  type CommentPageSchemaType,
  CommentPageSchema,
} from "@ecp.eth/shared/schemas";
import { useAutoBodyMinHeight } from "@/hooks/useAutoBodyMinHeight";
import { publicEnv } from "@/publicEnv";
import { useAccount } from "wagmi";
import { PoweredBy } from "@ecp.eth/shared/components";
import { CommentItem } from "./CommentItem";
import { createRootCommentsQueryKey } from "./queries";

type CommentSectionProps = {
  initialData?: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >;
};

export function CommentSection({ initialData }: CommentSectionProps) {
  useAutoBodyMinHeight();

  const { address, status } = useAccount();
  const { targetUri, disablePromotion } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const queryKey = useMemo(
    () => createRootCommentsQueryKey(address, targetUri),
    [targetUri, address]
  );

  const isAccountStatusResolved =
    status === "disconnected" || status === "connected";

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      enabled: isAccountStatusResolved,
      queryKey,
      initialData,
      initialPageParam: {
        cursor: undefined,
        limit: COMMENTS_PER_PAGE,
      } as ListCommentsQueryPageParamsSchemaType,
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchComments({
          appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          targetUri,
          limit: pageParam.limit,
          cursor: pageParam.cursor,
          signal,
          viewer: address,
          mode: "flat",
        });

        return CommentPageSchema.parse(response);
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      getNextPageParam(
        lastPage
      ): ListCommentsQueryPageParamsSchemaType | undefined {
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
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        targetUri,
        limit: COMMENTS_PER_PAGE,
        cursor: options.cursor,
        signal: options.signal,
        sort: "asc",
        viewer: address,
        mode: "flat",
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
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
      <div className="mb-4">
        <CommentForm />
      </div>
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
      {results.map((comment) => (
        <CommentItem
          comment={comment}
          key={comment.id}
          connectedAddress={address}
        />
      ))}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
          Load more
        </Button>
      )}
      {!disablePromotion && <PoweredBy className="mt-4" />}
    </div>
  );
}
