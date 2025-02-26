import { EmbedConfigSchema, HexSchema } from "@ecp.eth/sdk/schemas";
import { fetchComments } from "@ecp.eth/sdk";
import { decompressFromURI } from "lz-ts";
import { Toaster } from "@/components/ui/sonner";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "../providers";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { env } from "@/env";
import { ApplyTheme } from "@/components/ApplyTheme";
import { CommentSectionReadonly } from "@/components/comments/CommentSectionReadonly";

const SearchParamsSchema = z.object({
  author: HexSchema,
  config: z
    .preprocess((value) => {
      try {
        if (typeof value === "string") {
          return JSON.parse(decompressFromURI(value));
        }
      } catch {}
    }, EmbedConfigSchema)
    .optional(),
});

type EmbedPageProps = {
  searchParams: Promise<unknown>;
};

export default async function EmbedCommentsByAuthorPage({
  searchParams,
}: EmbedPageProps) {
  const parseSearchParamsResult = SearchParamsSchema.safeParse(
    await searchParams
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
              "  "
            )}
          </pre>
        }
      />
    );
  }

  const { author, config } = parseSearchParamsResult.data;

  try {
    const comments = await fetchComments({
      appSigner: env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      author,
      offset: 0,
      limit: COMMENTS_PER_PAGE,
    });

    return (
      <ApplyTheme config={config}>
        <main className="min-h-screen p-0 bg-background font-default">
          <div className="max-w-4xl mx-auto">
            <Providers>
              <CommentSectionReadonly
                author={author}
                initialData={{
                  pages: [comments],
                  pageParams: [
                    {
                      limit: comments.pagination.limit,
                      offset: comments.pagination.offset,
                    },
                  ],
                }}
              />
            </Providers>
          </div>
        </main>
        <Toaster />
      </ApplyTheme>
    );
  } catch (e) {
    console.error(e);
    return <ErrorScreen description="Could not load comments" />;
  }
}
