import { Toaster } from "@/components/ui/sonner";
import { CommentSection } from "@/components/comments/CommentSection";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "./providers";
import { EmbedConfigFromSearchParamsSchema } from "@/lib/schemas";
import { cn } from "@ecp.eth/shared/helpers";
import { MainWrapper } from "@/components/MainWrapper";

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

  try {
    // at the moment we don't use server-side comments fetching because we don't know the address of the viewer
    // which causes issues with the feed

    /* const comments = await fetchComments({
      app: env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      targetUri,
      limit: COMMENTS_PER_PAGE,
    });*/

    return (
      <Providers
        config={{
          targetUri,
          currentTimestamp: Date.now(),
          ...config,
        }}
      >
        <MainWrapper>
          <div
            className={cn(
              "mx-auto",
              config.restrictMaximumContainerWidth && "max-w-4xl",
            )}
          >
            <CommentSection
            /* initialData={{
                    pages: [comments],
                    pageParams: [
                      {
                        limit: comments.pagination.limit,
                        cursor: comments.pagination.endCursor,
                      },
                    ],
                  }}*/
            />
          </div>
        </MainWrapper>
        <Toaster />
      </Providers>
    );
  } catch (e) {
    console.error(e);
    return <ErrorScreen description="Could not load comments" />;
  }
}
