import { Hex, HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  fetchCommentReplies,
  FetchCommentRepliesOptions,
} from "@ecp.eth/sdk/indexer";
import { Toaster } from "@/components/ui/sonner";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "../providers";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { env } from "@/env";
import { CommentSectionReplies } from "@/components/comments/CommentSectionReplies";
import { EmbedConfigFromSearchParamsSchema } from "@/lib/schemas";
import { MainWrapper } from "@/components/MainWrapper";
import { cookies } from "next/headers";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";

const SearchParamsSchema = z.object({
  commentId: HexSchema,
  config: EmbedConfigFromSearchParamsSchema,
});

type EmbedPageProps = {
  searchParams: Promise<unknown>;
};

export default async function EmbedCommentsByRepliesPage({
  searchParams,
}: EmbedPageProps) {
  const parseSearchParamsResult = SearchParamsSchema.safeParse(
    await searchParams,
  );

  if (!parseSearchParamsResult.success) {
    return (
      <ErrorScreen
        description="Invalid search params"
        extra={
          <pre className="text-sm text-muted-foreground bg-muted p-2 text-left font-mono max-w-96">
            {JSON.stringify(
              parseSearchParamsResult.error.flatten().fieldErrors,
              null,
              "  ",
            )}
          </pre>
        }
      />
    );
  }

  const { commentId, config } = parseSearchParamsResult.data;
  const cookieStore = await cookies();
  // viewer cookie is set by useSyncViewerCookie hook inside CommentSection
  const viewer = cookieStore.get("viewer")?.value as Hex | undefined;

  try {
    const fetchCommentRepliesParams: FetchCommentRepliesOptions = {
      chainId: config.chainId,
      app: env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      commentType: COMMENT_TYPE_COMMENT,
      limit: COMMENTS_PER_PAGE,
      mode: "flat",
      viewer,
      commentId,
    };
    const comments = await fetchCommentReplies(fetchCommentRepliesParams);

    return (
      <Providers
        config={{
          commentId,
          currentTimestamp: Date.now(),
          ...config,
        }}
      >
        <MainWrapper
          restrictMaximumContainerWidth={config.restrictMaximumContainerWidth}
        >
          <CommentSectionReplies
            commentId={commentId}
            initialData={{
              pages: [comments],
              pageParams: [
                // the page param here is to describe how to fetch current page, not the next page
                {
                  limit: comments.pagination.limit,
                  cursor: undefined,
                },
              ],
            }}
            fetchCommentRepliesParams={fetchCommentRepliesParams}
          />
        </MainWrapper>
        <Toaster />
      </Providers>
    );
  } catch (e) {
    console.error(e);
    return <ErrorScreen description="Could not load comment replies" />;
  }
}
