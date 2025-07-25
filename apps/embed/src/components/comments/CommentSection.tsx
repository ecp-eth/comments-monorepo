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
import {
  useIsAccountStatusResolved,
  useNewCommentsChecker,
} from "@ecp.eth/shared/hooks";
import { Button } from "../ui/button";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import {
  type ListCommentsQueryPageParamsSchemaType,
  type CommentPageSchemaType,
  CommentPageSchema,
} from "@ecp.eth/shared/schemas";
import { useAutoBodyMinHeight } from "@/hooks/useAutoBodyMinHeight";
import { publicEnv } from "@/publicEnv";
import { useAccount, useChainId } from "wagmi";
import { PoweredBy } from "@ecp.eth/shared/components";
import { CommentItem } from "./CommentItem";
import { createRootCommentsQueryKey } from "./queries";
import { NoCommentsScreen } from "../NoCommentsScreen";
import { cn } from "@ecp.eth/shared/helpers";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";

type CommentSectionProps = {
  initialData?: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >;
};

export function CommentSection({ initialData }: CommentSectionProps) {
  useAutoBodyMinHeight();

  const { address } = useAccount();
  const chainId = useChainId();
  const { targetUri, disablePromotion, restrictMaximumContainerWidth } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const queryKey = useMemo(
    () => createRootCommentsQueryKey(address, chainId, targetUri),
    [targetUri, address, chainId],
  );

  const isAccountStatusResolved = useIsAccountStatusResolved();

  const {
    data,
    isSuccess,
    isPending,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    enabled: isAccountStatusResolved,
    queryKey,
    initialData,
    initialPageParam: {
      cursor: undefined,
      limit: COMMENTS_PER_PAGE,
    } as ListCommentsQueryPageParamsSchemaType,
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchComments({
        chainId,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        targetUri,
        limit: pageParam.limit,
        cursor: pageParam.cursor,
        signal,
        viewer: address,
        mode: "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });

      return CommentPageSchema.parse(response);
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    getNextPageParam(
      lastPage,
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
        chainId,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        targetUri,
        limit: COMMENTS_PER_PAGE,
        cursor: options.cursor,
        signal: options.signal,
        sort: "asc",
        viewer: address,
        mode: "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  return (
    <div
      className={cn("mx-auto", restrictMaximumContainerWidth && "max-w-2xl")}
    >
      <h2 className="text-headline font-bold mb-4 text-foreground">Comments</h2>
      <div className="mb-4">
        <CommentForm />
      </div>
      {isPending && <LoadingScreen />}
      {error && (
        <ErrorScreen
          description="Failed to load comments. Please try again."
          onRetry={() => refetch()}
        />
      )}
      {isSuccess && (
        <>
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
            <CommentItem comment={comment} key={comment.id} />
          ))}
          {hasNextPage && (
            <Button
              onClick={() => fetchNextPage()}
              variant="secondary"
              size="sm"
            >
              Load more
            </Button>
          )}
        </>
      )}
      {!disablePromotion && <PoweredBy className="mt-4" />}
    </div>
  );
}
