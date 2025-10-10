import { Toaster } from "@/components/ui/sonner";
import { CommentSection } from "@/components/comments/CommentSection";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "./providers";
import { EmbedConfigFromSearchParamsSchema } from "@/lib/schemas";
import { MainWrapper } from "@/components/MainWrapper";
import { fetchComments, FetchCommentsOptions } from "@ecp.eth/sdk/indexer";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { cookies } from "next/headers";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import { getAppSignerAddress } from "@/lib/utils";
import { publicEnv } from "@/publicEnv";

const SearchParamsSchema = z.object({
  targetUri: z.string().url(),
  config: EmbedConfigFromSearchParamsSchema,
});

type EmbedPageProps = {
  searchParams: Promise<unknown>;
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
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

  const { targetUri, config } = parseSearchParamsResult.data;
  const cookieStore = await cookies();
  // viewer cookie is set by useSyncViewerCookie hook inside CommentSection
  const viewer = cookieStore.get("viewer")?.value as Hex | undefined;

  try {
    const fetchCommentParams: FetchCommentsOptions = {
      chainId: config.chainId,
      app: getAppSignerAddress(config.app),
      apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      limit: COMMENTS_PER_PAGE,
      commentType: COMMENT_TYPE_COMMENT,
      mode: "flat",
      viewer,
      targetUri,
    };
    const comments = await fetchComments(fetchCommentParams);

    return (
      <Providers
        config={{
          targetUri,
          currentTimestamp: Date.now(),
          ...config,
        }}
      >
        <MainWrapper
          restrictMaximumContainerWidth={config.restrictMaximumContainerWidth}
        >
          <CommentSection
            initialData={{
              pages: [comments],
              pageParams: [
                {
                  limit: comments.pagination.limit,
                  cursor: undefined,
                },
              ],
            }}
            fetchCommentParams={fetchCommentParams}
          />
        </MainWrapper>
        <Toaster />
      </Providers>
    );
  } catch (e) {
    console.error(e);
    return <ErrorScreen description="Could not load comments" />;
  }
}
