import {
  EmbedConfigSchema,
  type EmbedConfigSchemaType,
} from "@ecp.eth/sdk/schemas";
import { fetchComments } from "@ecp.eth/sdk";
import { decompressFromURI } from "lz-ts";
import { Toaster } from "@/components/ui/sonner";
import { EmbedConfigProvider } from "@/components/EmbedConfigProvider";
import { CommentSection } from "@/components/comments/CommentSection";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "./providers";
import { createThemeCSSVariables } from "@/lib/theming";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { env } from "@/env";

const SearchParamsSchema = z.object({
  targetUri: z.string().url(),
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
  searchParams: Promise<{ targetUri?: string | null; theme?: string | null }>;
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
      <div className={config?.theme?.mode}>
        <LinkGoogleFont config={config} />
        <style
          dangerouslySetInnerHTML={{
            __html: createThemeCSSVariables(config?.theme),
          }}
        />
        <main className="min-h-screen p-0 bg-background font-default">
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
      </div>
    );
  } catch (e) {
    console.error(e);
    return <ErrorScreen description="Could not load comments" />;
  }
}

function LinkGoogleFont({ config }: { config?: EmbedConfigSchemaType }) {
  const fontFamily = config?.theme?.font?.fontFamily;

  if (!fontFamily || !("google" in fontFamily) || !fontFamily.google) {
    return null;
  }

  return (
    <link
      href={`https://fonts.googleapis.com/css2?family=${fontFamily.google.replace("_", "+")}&display=swap`}
      rel="stylesheet"
    />
  );
}
