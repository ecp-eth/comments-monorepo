import { EmbedConfigSchema } from "@ecp.eth/sdk/schemas";
import { decompressFromURI } from "lz-ts";
import { Toaster } from "@/components/ui/sonner";
import { EmbedConfigProvider } from "@/components/EmbedConfigProvider";
import { CommentSection } from "@/components/comments/CommentSection";
import { ErrorScreen } from "@/components/ErrorScreen";
import { z } from "zod";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import { createThemeCSSVariables } from "@/lib/theming";

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
    return <ErrorScreen description="Invalid search params" />;
  }

  const { targetUri, config } = parseSearchParamsResult.data;

  return (
    <body className={cn("antialised", config?.theme?.mode)}>
      <style
        dangerouslySetInnerHTML={{
          __html: createThemeCSSVariables(config?.theme),
        }}
      />
      <main className="min-h-screen p-0 bg-background">
        <div className="max-w-4xl mx-auto">
          <Providers>
            <EmbedConfigProvider value={{ targetUri }}>
              <CommentSection />
            </EmbedConfigProvider>
          </Providers>
        </div>
      </main>
      <Toaster />
    </body>
  );
}
