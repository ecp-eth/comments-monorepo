import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import { Toaster } from "@/components/ui/sonner";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "../providers";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { env } from "@/env";
import { CommentSectionReadonly } from "@/components/comments/CommentSectionReadonly";
import { EmbedConfigFromSearchParamsSchema } from "@/lib/schemas";
import { cn } from "@ecp.eth/shared/helpers";

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

  try {
    const comments = await fetchComments({
      chainId: config.chainId,
      app: env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      author,
      limit: COMMENTS_PER_PAGE,
    });

    return (
      <Providers
        config={{
          author,
          currentTimestamp: Date.now(),
          ...config,
        }}
      >
        <main className="min-h-screen p-0 font-default">
          <div
            className={cn(
              "mx-auto",
              config.restrictMaximumContainerWidth && "max-w-4xl",
            )}
          >
            <CommentSectionReadonly
              author={author}
              initialData={{
                pages: [comments],
                pageParams: [
                  {
                    limit: comments.pagination.limit,
                    cursor: comments.pagination.endCursor,
                  },
                ],
              }}
            />
          </div>
        </main>
        <Toaster />
      </Providers>
    );
  } catch (e) {
    console.error(e);
    return <ErrorScreen description="Could not load comments" />;
  }
}
