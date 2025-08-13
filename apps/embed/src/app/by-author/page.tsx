import { Hex, HexSchema } from "@ecp.eth/sdk/core/schemas";
import { fetchComments, FetchCommentsOptions } from "@ecp.eth/sdk/indexer";
import { Toaster } from "@/components/ui/sonner";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "../providers";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { env } from "@/env";
import { CommentSectionByAuthor } from "@/components/comments/CommentSectionByAuthor";
import { EmbedConfigFromSearchParamsSchema } from "@/lib/schemas";
import { MainWrapper } from "@/components/MainWrapper";
import { cookies } from "next/headers";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import { getAppSignerAddress } from "@/lib/utils";

const SearchParamsSchema = z.object({
  author: HexSchema,
  config: EmbedConfigFromSearchParamsSchema,
});

type EmbedPageProps = {
  searchParams: Promise<unknown>;
};

export default async function EmbedCommentsByAuthorPage({
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

  const { author, config } = parseSearchParamsResult.data;
  const cookieStore = await cookies();
  // viewer cookie is set by useSyncViewerCookie hook inside CommentSection
  const viewer = cookieStore.get("viewer")?.value as Hex | undefined;

  try {
    const fetchCommentParams: FetchCommentsOptions = {
      chainId: config.chainId,
      app: getAppSignerAddress(config.app),
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      commentType: COMMENT_TYPE_COMMENT,
      limit: COMMENTS_PER_PAGE,
      mode: "flat",
      author,
      viewer,
    };
    const comments = await fetchComments(fetchCommentParams);

    return (
      <Providers
        config={{
          author,
          currentTimestamp: Date.now(),
          ...config,
        }}
      >
        <MainWrapper
          restrictMaximumContainerWidth={config.restrictMaximumContainerWidth}
        >
          <CommentSectionByAuthor
            author={author}
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
