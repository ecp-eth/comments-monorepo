import { EmbedConfigSchema } from "@ecp.eth/sdk/schemas";
import { fetchComments } from "@ecp.eth/sdk";
import { decompressFromURI } from "lz-ts";
import { Toaster } from "@/components/ui/sonner";
import { EmbedConfigProvider } from "@/components/EmbedConfigProvider";
import { CommentSection } from "@/components/comments/CommentSection";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "./providers";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { env } from "@/env";
import { ApplyTheme } from "@/components/ApplyTheme";

const SearchParamsSchema = z.object({
  targetUri: z.string().url(),
  config: z
    .preprocess((value) => {
      try {
        if (typeof value === "string") {
          return JSON.parse(decompressFromURI(value));
        }
      } catch (err) {
        console.warn('failed to parse config', err)
      }
    }, EmbedConfigSchema)
    .optional(),
});

type EmbedPageProps = {
  searchParams: Promise<unknown>;
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
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

  const { targetUri, config } = parseSearchParamsResult.data;

  try {
    const comments = await fetchComments({
      appSigner: env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      targetUri,
      offset: 0,
      limit: COMMENTS_PER_PAGE,
    });

    return (
      <ApplyTheme config={config}>
        <main className="p-0 bg-background text-foreground font-default px-root-padding-horizontal py-root-padding-vertical">
          <div className="max-w-4xl mx-auto">
            <Providers>
              <EmbedConfigProvider value={{ targetUri }}>
                <CommentSection
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
              </EmbedConfigProvider>
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
